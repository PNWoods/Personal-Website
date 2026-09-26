import { strFromU8, unzipSync } from 'fflate'
import { chunkUnits, type ChunkDraft } from '../chunk'

/**
 * PowerPoint: a .pptx is a zip of XML. Slide text is every <a:t> run, joined
 * per paragraph; the title is the shape whose placeholder type is title or
 * ctrTitle. Speaker notes are appended when present. One unit per slide.
 */

function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
}

function paragraphs(xml: string): string[] {
  const out: string[] = []
  for (const p of xml.match(/<a:p\b[\s\S]*?<\/a:p>/g) ?? []) {
    const re = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g
    let text = ''
    let m: RegExpExecArray | null
    while ((m = re.exec(p)) !== null) text += decode(m[1])
    text = text.trim()
    if (text) out.push(text)
  }
  return out
}

function slideTitle(xml: string): string | null {
  for (const shape of xml.match(/<p:sp\b[\s\S]*?<\/p:sp>/g) ?? []) {
    if (/<p:ph\b[^>]*type="(?:title|ctrTitle)"/.test(shape)) {
      const t = paragraphs(shape).join(' ').trim()
      if (t) return t
    }
  }
  return null
}

function slideNumber(name: string): number {
  const m = /slide(\d+)\.xml$/i.exec(name)
  return m ? Number(m[1]) : 0
}

export function extractPptx(buffer: Uint8Array): ChunkDraft[] {
  const files = unzipSync(buffer)
  const slideNames = Object.keys(files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => slideNumber(a) - slideNumber(b))

  const units: { section: string; content: string }[] = []
  for (const name of slideNames) {
    const n = slideNumber(name)
    const xml = strFromU8(files[name])
    const title = slideTitle(xml)
    const body = paragraphs(xml).filter((p) => p !== title)
    const notesName = `ppt/notesSlides/notesSlide${n}.xml`
    const notes = files[notesName] ? paragraphs(strFromU8(files[notesName])) : []
    const parts = [...body]
    if (notes.length) parts.push(`Notes: ${notes.join(' ')}`)
    const content = parts.join('\n\n').trim()
    if (!content && !title) continue
    units.push({
      section: title ? `Slide ${n}: ${title}` : `Slide ${n}`,
      content: content || title || '',
    })
  }
  return chunkUnits(units)
}
