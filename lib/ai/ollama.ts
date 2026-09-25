import 'server-only'

/**
 * Server-side fetch to the Ollama instance. OLLAMA_URL points at the home
 * machine (through a Cloudflare Tunnel in production). When Cloudflare Access
 * service-token credentials are present they are attached as headers.
 */

export class OllamaError extends Error {
  status: number

  constructor(message: string, status = 502) {
    super(message)
    this.name = 'OllamaError'
    this.status = status
  }
}

const UNREACHABLE =
  'Ollama is unreachable. Is the home computer on and the cloudflared tunnel running?'
const ACCESS_REJECTED =
  'Cloudflare Access rejected the request. Check the service token in Vercel.'

function baseUrl() {
  const url = process.env.OLLAMA_URL
  if (!url) throw new OllamaError('OLLAMA_URL is not configured.', 500)
  return url.replace(/\/+$/, '')
}

function accessHeaders(): Record<string, string> {
  const id = process.env.CF_ACCESS_CLIENT_ID
  const secret = process.env.CF_ACCESS_CLIENT_SECRET
  if (id && secret) {
    return { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret }
  }
  return {}
}

export async function ollamaFetch(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<Response> {
  const { json, headers, ...rest } = init
  let response: Response

  try {
    response = await fetch(`${baseUrl()}${path}`, {
      ...rest,
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...accessHeaders(),
        ...(headers as Record<string, string> | undefined),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  } catch (err) {
    if (err instanceof OllamaError) throw err
    if ((err as Error)?.name === 'AbortError') throw err
    throw new OllamaError(UNREACHABLE)
  }

  if (response.ok) return response

  // Cloudflare Access answers 302 (login page) or 401/403 when the token is bad.
  if (
    response.status === 401 ||
    response.status === 403 ||
    (response.status >= 300 && response.status < 400)
  ) {
    throw new OllamaError(ACCESS_REJECTED)
  }

  let detail = ''
  try {
    const text = await response.text()
    try {
      detail = (JSON.parse(text) as { error?: string }).error ?? text
    } catch {
      detail = text
    }
  } catch {
    // ignore body read failures
  }
  throw new OllamaError(
    `Ollama returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`
  )
}
