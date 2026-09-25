/**
 * Parse a newline-delimited JSON stream. Chunks are not line-aligned, so the
 * trailing partial line is carried over between reads. Used on both the server
 * (reading Ollama) and the client (reading /api/chat).
 */
export async function* ndjsonLines<T = unknown>(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<T> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (line) yield JSON.parse(line) as T
        newline = buffer.indexOf('\n')
      }
    }
    buffer += decoder.decode()
    const rest = buffer.trim()
    if (rest) yield JSON.parse(rest) as T
  } finally {
    reader.releaseLock()
  }
}
