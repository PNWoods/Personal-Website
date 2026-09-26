import 'server-only'

import { estimateTokens } from '../tokens'
import type { Source } from '../types'
import { htmlToMarkdown, pageTitle } from './extract/html'
import { fetchUrl } from './fetchUrl'

/**
 * On-demand web search for "current knowledge": one Brave Search query, the
 * top results fetched and reduced to the passages most relevant to the
 * question, returned in the same Source shape as knowledge-base excerpts.
 * Nothing is stored; results are ephemeral per message.
 */

const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'
const RESULTS = 5
const FETCH_CONCURRENCY = 3
const FETCH_TIMEOUT_MS = 8000
const FETCH_MAX_BYTES = 2 * 1024 * 1024
/** Passages kept per page and their size. */
const WINDOWS_PER_PAGE = 2
const WINDOW_TOKENS = 220
const MIN_QUERY_WORDS = 3

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

export function webSearchConfigured(): boolean {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY)
}

/** Skip the API call for greetings and trivial follow-ups. */
export function worthSearching(query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length < MIN_QUERY_WORDS) return false
  return !/^(thanks?|thank you|ok(ay)?|cool|nice|great|yes|no|got it)[.!]*$/i.test(query.trim())
}

interface BraveResult {
  title?: string
  url?: string
  description?: string
  age?: string
  page_age?: string
}

async function braveSearch(query: string, signal?: AbortSignal): Promise<BraveResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY
  if (!key) throw new Error('BRAVE_SEARCH_API_KEY is not set.')
  const url = new URL(BRAVE_ENDPOINT)
  url.searchParams.set('q', query.slice(0, 400))
  url.searchParams.set('count', String(RESULTS))
  url.searchParams.set('text_decorations', 'false')
  url.searchParams.set('safesearch', 'moderate')
  const res = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': key,
    },
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200)
    throw new Error(`Brave Search returned ${res.status}${detail ? `: ${detail}` : ''}`)
  }
  const data = (await res.json()) as { web?: { results?: BraveResult[] } }
  return (data.web?.results ?? []).filter((r) => r.url && /^https?:/i.test(r.url))
}

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
    // grow the window with neighbouring paragraphs until it is WINDOW_TOKENS
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
  result: BraveResult,
  query: string,
  signal?: AbortSignal
): Promise<{ title: string; url: string; age: string | null; windows: string[] }> {
  const url = result.url as string
  const fallbackTitle = result.title?.trim() || url
  const age = result.page_age ?? result.age ?? null
  try {
    const fetched = await fetchUrl(url, { maxBytes: FETCH_MAX_BYTES, timeoutMs: FETCH_TIMEOUT_MS, signal })
    if (!fetched.contentType.includes('html') && !fetched.contentType.startsWith('text/')) {
      throw new Error('not text')
    }
    const html = new TextDecoder('utf-8').decode(fetched.body)
    const markdown = fetched.contentType.includes('html') ? htmlToMarkdown(html) : html
    const windows = bestWindows(markdown, query)
    const title = (fetched.contentType.includes('html') && pageTitle(html)) || fallbackTitle
    if (windows.length) return { title, url: fetched.url, age, windows }
  } catch {
    // fall through to the search snippet
  }
  return {
    title: fallbackTitle,
    url,
    age,
    windows: result.description ? [result.description] : [],
  }
}

export async function searchWeb(
  query: string,
  opts: { signal?: AbortSignal; tokenBudget: number }
): Promise<WebSearchResult> {
  if (!webSearchConfigured()) return { excerpts: [], note: 'Web search is not configured.' }
  if (!worthSearching(query)) return { excerpts: [] }

  const results = await braveSearch(query, opts.signal)
  if (results.length === 0) return { excerpts: [], note: 'No web results.' }

  // Fetch pages a few at a time, keeping result order.
  const pages: Awaited<ReturnType<typeof fetchPage>>[] = []
  for (let i = 0; i < results.length; i += FETCH_CONCURRENCY) {
    const batch = results.slice(i, i + FETCH_CONCURRENCY)
    pages.push(...(await Promise.all(batch.map((r) => fetchPage(r, query, opts.signal)))))
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
          title: page.age ? `${page.title} (${page.age.slice(0, 10)})` : page.title,
          section: new URL(page.url).hostname.replace(/^www\./, ''),
          snippet: w.replace(/\s+/g, ' ').slice(0, 240),
          sourceType: 'web',
          url: page.url,
        },
      })
    }
  }
  return { excerpts }
}
