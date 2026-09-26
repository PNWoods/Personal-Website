import 'server-only'

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Fetch a public web page for indexing, with the guards a server-side
 * fetcher needs: http(s) only, no private / loopback / link-local / metadata
 * addresses (re-checked on every redirect), size and time caps.
 */

export const URL_MAX_BYTES = 5 * 1024 * 1024
export const URL_TIMEOUT_MS = 20_000
const MAX_REDIRECTS = 3
const USER_AGENT = 'Mozilla/5.0 (compatible; pnwoods-knowledge/1.0; +https://pnwoods.com)'

export interface Fetched {
  url: string
  contentType: string
  body: Uint8Array
}

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) || // link-local incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) // CGNAT (Tailscale lives here)
  )
}

function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase()
  if (s === '::1' || s === '::') return true
  if (s.startsWith('fe8') || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb')) return true // link-local
  if (s.startsWith('fc') || s.startsWith('fd')) return true // unique local
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s)
  if (v4) return isPrivateIPv4(v4[1])
  return false
}

async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs can be fetched.')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error('Local addresses are not allowed.')
  }
  const family = isIP(host)
  const addresses = family ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  if (addresses.length === 0) throw new Error(`Could not resolve ${host}.`)
  for (const ip of addresses) {
    const bad = isIP(ip) === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip)
    if (bad) throw new Error('That address points at a private network and cannot be fetched.')
  }
}

export async function fetchUrl(
  input: string,
  opts: { maxBytes?: number; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<Fetched> {
  const maxBytes = opts.maxBytes ?? URL_MAX_BYTES
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error('That is not a valid URL.')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? URL_TIMEOUT_MS)
  opts.signal?.addEventListener('abort', () => controller.abort())

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublic(url)
      const res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/pdf,text/plain,text/markdown;q=0.9,*/*;q=0.5',
        },
      })
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location')
        if (!loc) throw new Error(`Redirect without a location (${res.status}).`)
        url = new URL(loc, url)
        continue
      }
      if (!res.ok) throw new Error(`The page returned HTTP ${res.status}.`)
      const declared = Number(res.headers.get('content-length') ?? 0)
      if (declared > maxBytes) throw new Error('The page is larger than the 5 MB limit.')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Empty response.')
      const parts: Uint8Array[] = []
      let total = 0
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        total += value.length
        if (total > maxBytes) {
          void reader.cancel()
          throw new Error('The page is larger than the 5 MB limit.')
        }
        parts.push(value)
      }
      const body = new Uint8Array(total)
      let offset = 0
      for (const p of parts) {
        body.set(p, offset)
        offset += p.length
      }
      return {
        url: url.toString(),
        contentType: (res.headers.get('content-type') ?? '').toLowerCase(),
        body,
      }
    }
    throw new Error('Too many redirects.')
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw new Error('Fetching the page timed out.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}
