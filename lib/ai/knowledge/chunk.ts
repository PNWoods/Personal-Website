import { estimateTokens } from '../tokens'

/**
 * Splits documents into chunks for embedding. Pure functions, no I/O.
 *
 * Markdown/prose: blocks (paragraphs, lists, tables, fenced code) are packed
 * greedily to ~CHUNK_TOKENS under the current heading path, with a small
 * overlap carried from the previous chunk. Fences are never split unless one
 * alone exceeds CHUNK_MAX.
 */

export interface ChunkDraft {
  idx: number
  section: string | null
  content: string
  tokenCount: number
}

export const CHUNK_TOKENS = 400
export const CHUNK_OVERLAP = 60
export const CHUNK_MAX = 600

interface Block {
  section: string | null
  text: string
  tokens: number
  fence: boolean
}

const FENCE = /^(```|~~~)/
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/

/** Turn markdown into blocks tagged with their heading path ("A › B › C"). */
function blocksFromMarkdown(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  const headings: string[] = []
  let buf: string[] = []
  let inFence = false
  let fenceMarker = ''

  const section = () => {
    const parts = headings.filter((h) => h && h.trim())
    return parts.length ? parts.join(' › ') : null
  }
  const flush = (fence = false) => {
    const t = buf.join('\n').trim()
    if (t) blocks.push({ section: section(), text: t, tokens: estimateTokens(t), fence })
    buf = []
  }

  for (const line of lines) {
    if (inFence) {
      buf.push(line)
      if (line.startsWith(fenceMarker)) {
        inFence = false
        flush(true)
      }
      continue
    }
    const fence = FENCE.exec(line)
    if (fence) {
      flush()
      inFence = true
      fenceMarker = fence[1]
      buf.push(line)
      continue
    }
    const h = HEADING.exec(line)
    if (h) {
      flush()
      const level = h[1].length
      headings.splice(level - 1)
      headings[level - 1] = h[2]
      // drop any deeper stale headings left from a previous branch
      for (let i = 0; i < headings.length; i++) if (headings[i] === undefined) headings[i] = ''
      continue
    }
    if (line.trim() === '') {
      flush()
      continue
    }
    buf.push(line)
  }
  if (inFence) flush(true)
  else flush()
  return blocks
}

/**
 * Break one very long line (a wall-of-text paragraph, a minified row) into
 * pieces of at most `maxTokens`, preferring sentence boundaries, then spaces,
 * then hard cuts.
 */
function splitLongLine(line: string, maxTokens: number): string[] {
  if (estimateTokens(line) <= maxTokens) return [line]
  const maxChars = Math.floor(maxTokens * 3.5)
  const out: string[] = []
  let buf = ''
  const push = () => {
    if (buf.trim()) out.push(buf.trim())
    buf = ''
  }
  for (const sentence of line.split(/(?<=[.!?;:])\s+/)) {
    if (sentence.length > maxChars) {
      push()
      // no sentence boundaries: cut on spaces, then hard-cut the remainder
      let rest = sentence
      while (rest.length > maxChars) {
        let cut = rest.lastIndexOf(' ', maxChars)
        if (cut < maxChars / 2) cut = maxChars
        out.push(rest.slice(0, cut).trim())
        rest = rest.slice(cut).trim()
      }
      buf = rest
      continue
    }
    if (buf.length + sentence.length + 1 > maxChars) push()
    buf = buf ? `${buf} ${sentence}` : sentence
  }
  push()
  return out
}

/** Split an oversized block into pieces of at most CHUNK_TOKENS. */
function splitBlock(block: Block): Block[] {
  const lines = block.fence
    ? block.text.split('\n')
    : block.text.split('\n').flatMap((l) => splitLongLine(l, CHUNK_TOKENS))
  let open = ''
  let close = ''
  if (block.fence && lines.length > 2) {
    open = lines.shift() as string
    close = lines.pop() as string
  }
  const pieces: Block[] = []
  let buf: string[] = []
  let tokens = 0
  const push = () => {
    if (!buf.length) return
    const body = buf.join('\n')
    const text = block.fence ? `${open}\n${body}\n${close}` : body
    pieces.push({ ...block, text, tokens: estimateTokens(text) })
    buf = []
    tokens = 0
  }
  for (const line of lines) {
    const t = estimateTokens(line) + 1
    if (tokens + t > CHUNK_TOKENS && buf.length) push()
    buf.push(line)
    tokens += t
  }
  push()
  return pieces
}

/** Greedy-pack blocks into chunks; a new section always starts a new chunk. */
export function packBlocks(blocks: Block[]): ChunkDraft[] {
  const out: ChunkDraft[] = []
  let current: Block[] = []
  let tokens = 0
  let section: string | null = null

  const flush = () => {
    if (!current.length) return
    const content = current.map((b) => b.text).join('\n\n')
    out.push({ idx: out.length, section, content, tokenCount: estimateTokens(content) })
    // carry trailing blocks as overlap for the next chunk in the same section
    const carry: Block[] = []
    let carried = 0
    for (let i = current.length - 1; i >= 0; i--) {
      if (carried + current[i].tokens > CHUNK_OVERLAP) break
      carry.unshift(current[i])
      carried += current[i].tokens
    }
    current = carry
    tokens = carried
  }

  for (const raw of blocks) {
    const pieces = raw.tokens > CHUNK_MAX ? splitBlock(raw) : [raw]
    for (const block of pieces) {
      if (block.section !== section) {
        flush()
        current = []
        tokens = 0
        section = block.section
      } else if (
        tokens + block.tokens > CHUNK_TOKENS &&
        current.length &&
        // a chunk smaller than the overlap would be carried forward anyway;
        // let it overflow slightly instead of emitting a sliver
        tokens > CHUNK_OVERLAP
      ) {
        flush()
      }
      current.push(block)
      tokens += block.tokens
    }
  }
  if (current.length) {
    const content = current.map((b) => b.text).join('\n\n')
    out.push({ idx: out.length, section, content, tokenCount: estimateTokens(content) })
  }
  // overlap-only leftovers can duplicate the previous chunk verbatim; drop those
  return dedupe(out)
}

function dedupe(chunks: ChunkDraft[]): ChunkDraft[] {
  const seen = new Set<string>()
  const out: ChunkDraft[] = []
  for (const c of chunks) {
    const key = c.content
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...c, idx: out.length })
  }
  return out
}

/** Markdown or plain prose (plain text simply has no headings). */
export function chunkMarkdown(text: string): ChunkDraft[] {
  return packBlocks(blocksFromMarkdown(text))
}

/**
 * Units that must not be parsed as markdown (CSV row groups, SQL statements):
 * each unit is one opaque block, split by lines only if it exceeds CHUNK_MAX.
 */
export function chunkRawUnits(units: { section: string | null; content: string }[]): ChunkDraft[] {
  const blocks: Block[] = []
  for (const u of units) {
    const text = u.content.trim()
    if (!text) continue
    blocks.push({ section: u.section, text, tokens: estimateTokens(text), fence: false })
  }
  return packBlocks(blocks)
}

/**
 * Pre-split units (pages, slides, table definitions): each unit keeps its own
 * section label and is windowed only if it is too large on its own.
 */
export function chunkUnits(units: { section: string; content: string }[]): ChunkDraft[] {
  const blocks: Block[] = []
  for (const u of units) {
    const text = u.content.trim()
    if (!text) continue
    for (const b of blocksFromMarkdown(text)) {
      blocks.push({ ...b, section: b.section ? `${u.section} › ${b.section}` : u.section })
    }
  }
  return packBlocks(blocks)
}
