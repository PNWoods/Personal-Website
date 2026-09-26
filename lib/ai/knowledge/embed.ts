import 'server-only'

import { OllamaError, ollamaFetch } from '../ollama'

/**
 * Text embeddings via the Ollama host. The schema fixes the vector size at
 * 1024 (qwen3-embedding:0.6b); a different model must match that or every
 * document has to be re-indexed after changing the column.
 */
export const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'qwen3-embedding:0.6b'
export const EMBED_DIMS = 1024

const BATCH = 32
/** Qwen3-embedding is instruction tuned: queries get a task prefix, documents do not. */
const QUERY_PREFIX = 'Instruct: Retrieve passages that answer the question.\nQuery: '

export async function embedTexts(
  texts: string[],
  opts: { kind?: 'query' | 'document'; signal?: AbortSignal } = {}
): Promise<number[][]> {
  if (texts.length === 0) return []
  const prefix = opts.kind === 'query' ? QUERY_PREFIX : ''
  const out: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH).map((t) => prefix + t)
    const res = await ollamaFetch('/api/embed', {
      method: 'POST',
      signal: opts.signal,
      json: { model: EMBED_MODEL, input: batch, truncate: true, keep_alive: '30m' },
    })
    const data = (await res.json()) as { embeddings?: number[][]; error?: string }
    if (data.error) throw new OllamaError(data.error)
    const vectors = data.embeddings ?? []
    if (vectors.length !== batch.length) {
      throw new OllamaError(
        `Embedding model returned ${vectors.length} vectors for ${batch.length} inputs.`
      )
    }
    for (const v of vectors) {
      if (v.length !== EMBED_DIMS) {
        throw new OllamaError(
          `Embedding model ${EMBED_MODEL} returned ${v.length} dims; the schema expects ${EMBED_DIMS}.`
        )
      }
    }
    out.push(...vectors)
  }
  return out
}

/** The text that gets embedded for a chunk: title and section give it context. */
export function embedInput(title: string, section: string | null, content: string): string {
  const head = section ? `${title} › ${section}` : title
  return `${head}\n\n${content}`
}
