import 'server-only'

import { accessHeaders } from '../ollama'
import { estimateTokens } from '../tokens'
import type { Source } from '../types'
import { htmlToMarkdown, pageTitle } from './extract/html'
import { fetchUrl } from './fetchUrl'

/**
 * On-demand web search for "current knowledge": one search query, the top
 * results fetched and reduced to the passages most relevant to the question,
 * returned in the same Source shape as knowledge-base excerpts. Nothing is
 * stored; results are ephemeral per message.
 *
 * Providers:
 *   searxng (default when SEARXNG_URL is set): self-hosted metasearch, free,
 *     reached through the same Cloudflare tunnel + Access token as Ollama.
 *   brave (when BRAVE_SEARCH_API_KEY is set and SEARXNG_URL is not).
 */

const RESULTS = 5
const FETCH_CONCURRENCY = 3
const FETCH_TIMEOUT_MS = 8000
const FETCH_MAX_BYTES = 2 * 1024 * 1024
/** Passages kept per page and their size. */
const WINDOWS_PER_PAGE = 2
const WINDOW_TOKENS = 220
const MIN_QUERY_WORDS = 3
const SEARCH_TIMEOUT_MS = 15_000

export interface WebExcerpt {
  source: Source
  content: string
  tokens: number
}

export interface WebSearchResult {
  excerpts: WebExcerpt[]
  /** Human-readable reason when the search was skipped or failed. */
  note?: string
}

interface SearchHit {
  title: string
  url: string
  snippet: string | null
  /** ISO date or human "age" string when the provider knows it. */
  date: string | null
}

type Provider = 'searxng' | 'brave'

function provider(): Provider | null {
  const forced = process.env.SEARCH_PROVIDER?.toLowerCase()
  if (forced === 'searxng' || forced === 'brave') return forced
  if (process.env.SEARXNG_URL) return 'searxng'
  if (process.env.BRAVE_SEARCH_API_KEY) return 'brave'
  return null
}

export function webSearchConfigured(): boolean {
  const p = provider()
  if (p === 'searxng') return Boolean(process.env.SEARXNG_URL)
  if (p === 'brave') return Boolean(process.env.BRAVE_SEARCH_API_KEY)
  return false
}

/** Skip the search for greetings and trivial follow-ups. */
export function worthSearching(query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length < MIN_QUERY_WORDS) return false
  return !/^(thanks?|thank you|ok(ay)?|cool|nice|great|yes|no|got it)[.!]*$/i.test(query.trim())
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  signal?.addEventListener('abort', () => controller.abort())
  controller.signal.addEventListener('abort', () => clearTimeout(timer))
  return controller.signal
}

// ---------------------------------------------------------------------------
// SearXNG (self-hosted). Needs `search.formats: [html, json]` in settings.yml.
// ---------------------------------------------------------------------------
async function searxngSearch(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const base = (process.env.SEARXNG_URL ?? '').replace(/\/+$/, '')
  if (!base) throw new Error('SEARXNG_URL is not set.')
  const url = new URL(`${base}/search`)
  url.searchParams.set('q', query.slice(0, 400))
  url.searchParams.set('format', 'json')
  url.searchParams.set('categories', 'general')
  url.searchParams.set('language', process.env.SEARXNG_LANGUAGE || 'en')
  url.searchParams.set('safesearch', '1')
  const res = await fetch(url, {
    signal: withTimeout(signal, SEARCH_TIMEOUT_MS),
    cache: 'no-store',
    headers: { Accept: 'application/json', ...accessHeaders() },
  })
  if (res.status === 401 || res.status === 403 || (res.status >= 300 && res.status < 400)) {
    throw new Error('SearXNG is behind Cloudflare Access and rejected the service token.')
  }
  if (!res.ok) throw new Error(`SearXNG returned ${res.status}.`)
  const data = (await res.json()) as {
    results?: { title?: string; url?: string; content?: string; publishedDate?: string | null }[]
  }
  return (data.results ?? [])
    .filter((r) => r.url && /^https?:/i.test(r.url))
    .slice(0, RESULTS)
    .map((r) => ({
      title: r.title?.trim() || (r.url as string),
      url: r.url as string,
      snippet: r.content?.trim() || null,
      date: r.publishedDate ?? null,
    }))
}

// ---------------------------------------------------------------------------
// Brave Search API (prepaid; $5 free credit / month ≈ 1,000 queries).
// ---------------------------------------------------------------------------
async function braveSearch(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY
  if (!key) throw new Error('BRAVE_SEARCH_API_KEY is not set.')
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query.slice(0, 400))
  url.searchParams.set('count', String(RESULTS))
  url.searchParams.set('text_decorations', 'false')
  url.searchParams.set('safesearch', 'moderate')
  const res = await fetch(url, {
    signal: withTimeout(signal, SEARCH_TIMEOUT_MS),
    headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': key },
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200)
    throw new Error(`Brave Search returned ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  const data = (await res.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string; age?: string; page_age?: string }[] }
  }
  return (data.web?.results ?? [])
    .filter((r) => r.url && /^https?:/i.test(r.url))
    .map((r) => ({
      title: r.title?.trim() || (r.url as string),
      url: r.url as string,
      snippet: r.description?.trim() || null,
      date: r.page_age ?? r.age ?? null,
    }))
}

// ---------------------------------------------------------------------------
// Passage selection
// ---------------------------------------------------------------------------
const STOP = new Set(
  'a an the and or of to in on for with is are was were be been being at by from as it its this that these those what which who how why when where do does did can could should would will i you we they me my your our their not no yes'.split(' ')
)

function terms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
}

/** Score paragraphs by query-term overlap and return the best windows. */
function bestWindows(markdown: string, query: string): string[] {
  const q = new Set(terms(query))
  if (q.size === 0) return []
  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40)
  const scored = paragraphs.map((p, i) => {
    const t = terms(p)
    let hits = 0
    for (const w of t) if (q.has(w)) hits++
    return { i, score: t.length ? hits / Math.sqrt(t.length) : 0 }
  })
  scored.sort((a, b) => b.score - a.score)
  const picked = new Set<number>()
  const out: string[] = []
  for (const s of scored) {
    if (out.length >= WINDOWS_PER_PAGE || s.score === 0) break
    if (picked.has(s.i)) continue
    const parts = [paragraphs[s.i]]
    picked.add(s.i)
    let lo = s.i
    let hi = s.i
    while (estimateTokens(parts.join('\n\n')) < WINDOW_TOKENS) {
      if (hi + 1 < paragraphs.length && !picked.has(hi + 1)) {
        hi++
        parts.push(paragraphs[hi])
        picked.add(hi)
      } else if (lo - 1 >= 0 && !picked.has(lo - 1)) {
        lo--
        parts.unshift(paragraphs[lo])
        picked.add(lo)
      } else break
    }
    let text = parts.join('\n\n')
    if (estimateTokens(text) > WINDOW_TOKENS * 1.5) text = text.slice(0, Math.floor(WINDOW_TOKENS * 1.5 * 3.5))
    out.push(text)
  }
  return out
}

async function fetchPage(
  hit: SearchHit,
  query: string,
  signal?: AbortSignal
): Promise<{ title: string; url: string; date: string | null; windows: string[] }> {
  try {
    const fetched = await fetchUrl(hit.url, { maxBytes: FETCH_MAX_BYTES, timeoutMs: FETCH_TIMEOUT_MS, signal })
    if (!fetched.contentType.includes('html') && !fetched.contentType.startsWith('text/')) {
      throw new Error('not text')
    }
    const raw = new TextDecoder('utf-8').decode(fetched.body)
    const isHtml = fetched.contentType.includes('html')
    const markdown = isHtml ? htmlToMarkdown(raw) : raw
    const windows = bestWindows(markdown, query)
    const title = (isHtml && pageTitle(raw)) || hit.title
    if (windows.length) return { title, url: fetched.url, date: hit.date, windows }
  } catch {
    // fall through to the search snippet
  }
  return { title: hit.title, url: hit.url, date: hit.date, windows: hit.snippet ? [hit.snippet] : [] }
}

export async function searchWeb(
  query: string,
  opts: { signal?: AbortSignal; tokenBudget: number }
): Promise<WebSearchResult> {
  const p = provider()
  if (!p || !webSearchConfigured()) return { excerpts: [], note: 'Web search is not configured.' }
  if (!worthSearching(query)) return { excerpts: [] }

  const hits = p === 'searxng' ? await searxngSearch(query, opts.signal) : await braveSearch(query, opts.signal)
  if (hits.length === 0) return { excerpts: [], note: 'No web results.' }

  // Fetch pages a few at a time, keeping result order.
  const pages: Awaited<ReturnType<typeof fetchPage>>[] = []
  for (let i = 0; i < hits.length; i += FETCH_CONCURRENCY) {
    const batch = hits.slice(i, i + FETCH_CONCURRENCY)
    pages.push(...(await Promise.all(batch.map((h) => fetchPage(h, query, opts.signal)))))
  }

  const excerpts: WebExcerpt[] = []
  let budget = opts.tokenBudget
  for (const page of pages) {
    for (const w of page.windows) {
      const tokens = estimateTokens(w)
      if (tokens > budget) continue
      budget -= tokens
      excerpts.push({
        content: w,
        tokens,
        source: {
          n: 0, // renumbered when merged with knowledge-base excerpts
          chunkId: '',
          documentId: '',
          title: page.date ? `${page.title} (${page.date.slice(0, 10)})` : page.title,
          section: new URL(page.url).hostname.replace(/^www\./, ''),
          snippet: w.replace(/\s+/g, ' ').slice(0, 240),
          sourceType: 'web',
          url: page.url,
        },
      })
    }
  }
  return { excerpts, note: `provider=${p}` }
}
