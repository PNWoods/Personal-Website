import { extractText, getDocumentProxy } from 'unpdf'
import { chunkUnits, type ChunkDraft } from '../chunk'

/**
 * PDF: one unit per page labelled "Page N"; long pages are windowed by the
 * chunker. Scanned PDFs have no text layer and produce nothing, which the
 * caller reports as an error.
 */
export async function extractPdf(buffer: Uint8Array): Promise<ChunkDraft[]> {
  const pdf = await getDocumentProxy(buffer)
  const { text } = await extractText(pdf, { mergePages: false })
  const pages = Array.isArray(text) ? text : [text]
  const units = pages
    .map((page, i) => ({ section: `Page ${i + 1}`, content: normalize(page) }))
    .filter((u) => u.content.length > 0)
  return chunkUnits(units)
}

/** PDF text extraction yields odd spacing; tidy without losing paragraphs. */
function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
