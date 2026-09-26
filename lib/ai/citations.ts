import type { Source } from './types'

/**
 * Where a citation should take the user. Client-safe.
 *
 * - notes / files: the Knowledge page with the document open and the exact
 *   chunk scrolled into view and highlighted (?doc=…&chunk=…).
 * - web pages (indexed URLs and live web results): the page itself with a
 *   text fragment so the browser scrolls to and highlights the passage.
 */
export interface CitationTarget {
  url: string
  external: boolean
}

/** Chromium, Firefox and Safari all support text fragments now. */
export function textFragment(snippet: string): string {
  const flat = snippet.replace(/\s+/g, ' ').replace(/…$/, '').trim()
  if (!flat) return ''
  // A short, exact prefix matches most reliably; long strings often fail
  // when the page's whitespace differs from the extracted text.
  const words = flat.split(' ').slice(0, 8).join(' ')
  const cleaned = words.replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9)]+$/, '')
  if (cleaned.length < 12) return ''
  return `#:~:text=${encodeURIComponent(cleaned).replace(/-/g, '%2D').replace(/,/g, '%2C')}`
}

export function citationTarget(
  source: Source,
  href: (path: string) => string
): CitationTarget {
  if ((source.sourceType === 'web' || source.sourceType === 'url') && source.url) {
    return { url: `${source.url}${textFragment(source.snippet)}`, external: true }
  }
  const params = new URLSearchParams({ doc: source.documentId })
  if (source.chunkId) params.set('chunk', source.chunkId)
  return { url: href(`/knowledge?${params.toString()}`), external: false }
}
