import mammoth from 'mammoth'
import { chunkMarkdown, type ChunkDraft } from '../chunk'

// mammoth ships convertToMarkdown at runtime but its typings only declare
// convertToHtml/extractRawText.
const convertToMarkdown = (
  mammoth as unknown as {
    convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string }>
  }
).convertToMarkdown

/** Word: mammoth converts headings/lists/tables to markdown, then the markdown chunker applies. */
export async function extractDocx(buffer: Buffer): Promise<ChunkDraft[]> {
  const result = await convertToMarkdown({ buffer })
  return chunkMarkdown(result.value)
}
