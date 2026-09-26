/**
 * Small HTML -> Markdown converter for indexing web pages. Not a full parser:
 * it strips chrome (scripts, nav, footers), prefers <main>/<article>, and
 * turns headings, lists, code, tables and paragraphs into markdown so the
 * markdown chunker can build heading-aware chunks.
 */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  copy: '©',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
}

function strip(html: string, tags: string[]): string {
  let out = html
  for (const t of tags) {
    out = out.replace(new RegExp(`<${t}\\b[^>]*>[\\s\\S]*?<\\/${t}>`, 'gi'), '')
  }
  return out
}

export function pageTitle(html: string): string | null {
  const og = /<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html)
  if (og) return decodeEntities(og[1]).trim()
  const t = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return t ? decodeEntities(t[1]).replace(/\s+/g, ' ').trim() : null
}

export function htmlToMarkdown(html: string): string {
  let h = html.replace(/<!--[\s\S]*?-->/g, '')
  h = strip(h, ['script', 'style', 'noscript', 'svg', 'nav', 'footer', 'header', 'aside', 'form', 'iframe', 'template'])

  // Prefer the main content region when the page marks one.
  const main = /<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(h)
  if (main && main[2].replace(/<[^>]+>/g, '').trim().length > 200) h = main[2]

  // Code blocks first so their contents are not reformatted.
  h = h.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner: string) => {
    const code = decodeEntities(inner.replace(/<[^>]+>/g, '')).replace(/^\n+|\n+$/g, '')
    return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`
  })
  h = h.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner: string) => `\`${inner.replace(/<[^>]+>/g, '')}\``)

  // Tables -> pipe rows.
  h = h.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_m, inner: string) => {
    const rows = inner.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []
    const lines = rows.map((r) => {
      const cells = (r.match(/<t[hd]\b[^>]*>[\s\S]*?<\/t[hd]>/gi) ?? []).map((c) =>
        c.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      )
      return `| ${cells.join(' | ')} |`
    })
    if (lines.length === 0) return ''
    const cols = (lines[0].match(/\|/g)?.length ?? 2) - 1
    lines.splice(1, 0, `|${' --- |'.repeat(cols)}`)
    return `\n\n${lines.join('\n')}\n\n`
  })

  h = h
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      return text ? `\n\n${'#'.repeat(Number(n))} ${text}\n\n` : ''
    })
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner: string) => `\n- ${inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}`)
    .replace(/<\/(?:ul|ol)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|section|blockquote|dd|dt|figcaption)>/gi, '\n\n')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim()
      return text && /^https?:/i.test(href) ? `${text} (${href})` : text
    })
    .replace(/<[^>]+>/g, '')

  return decodeEntities(h)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
