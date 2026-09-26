import 'server-only'

import { OllamaError, ollamaFetch } from '../../ollama'

/**
 * Images are indexed by asking the vision-capable chat model to transcribe
 * every piece of visible text and describe what the image shows. The result
 * is stored as the document's content and chunked like a note.
 */
export const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'qwen3.6:35b-a3b-coding'

const PROMPT = `Transcribe this image for a searchable knowledge base.

1. Write out ALL visible text verbatim, preserving structure: tables as Markdown tables, code or commands in fenced code blocks, lists as lists, headings as headings. Keep identifiers, numbers, file paths and column names exactly as shown.
2. Then add a short section "## Description" saying what the image shows (screenshot of which application, diagram of what, photo of what) and any relationships a diagram conveys.

Output Markdown only. Do not add commentary about being an AI.`

export async function describeImage(
  buffer: Uint8Array,
  opts: { signal?: AbortSignal } = {}
): Promise<string> {
  const res = await ollamaFetch('/api/chat', {
    method: 'POST',
    signal: opts.signal,
    json: {
      model: VISION_MODEL,
      stream: false,
      think: false,
      keep_alive: '30m',
      options: { num_ctx: 8192, num_predict: 2500, temperature: 0.1 },
      messages: [
        {
          role: 'user',
          content: PROMPT,
          images: [Buffer.from(buffer).toString('base64')],
        },
      ],
    },
  })
  const data = (await res.json()) as { message?: { content?: string }; error?: string }
  if (data.error) throw new OllamaError(data.error)
  const text = data.message?.content?.trim()
  if (!text) throw new OllamaError('The vision model returned nothing for this image.')
  return text
}
