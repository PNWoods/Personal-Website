/**
 * remark plugin: turns citation markers like `[2]` in text into links with a
 * `cite:2` URL, so Markdown.tsx can render them as clickable superscripts.
 * Only numbers within 1..count are converted; everything else stays literal.
 * Text inside code, inline code and existing links is left alone.
 */

interface MdNode {
  type: string
  value?: string
  url?: string
  children?: MdNode[]
}

const MARKER = /\[(\d{1,3})\]/g
const SKIP = new Set(['code', 'inlineCode', 'link', 'linkReference', 'image'])

export default function remarkCitations(count: number) {
  return () => (tree: MdNode) => {
    if (count <= 0) return
    walk(tree)
  }

  function walk(node: MdNode) {
    if (!node.children) return
    const next: MdNode[] = []
    for (const child of node.children) {
      if (child.type === 'text' && child.value && /\[\d{1,3}\]/.test(child.value)) {
        next.push(...split(child.value))
      } else {
        if (!SKIP.has(child.type)) walk(child)
        next.push(child)
      }
    }
    node.children = next
  }

  function split(text: string): MdNode[] {
    const out: MdNode[] = []
    let last = 0
    const re = new RegExp(MARKER.source, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const n = Number(m[1])
      const start = m.index
      if (n < 1 || n > count) continue
      if (start > last) out.push({ type: 'text', value: text.slice(last, start) })
      out.push({
        type: 'link',
        url: `cite:${n}`,
        children: [{ type: 'text', value: String(n) }],
      })
      last = start + m[0].length
    }
    if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
    return out
  }
}
