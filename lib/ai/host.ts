// Host helpers for serving the chat app at ai.pnwoods.com from the same
// Next.js project. The middleware rewrites requests on AI_HOST to /ai/*.

export const AI_HOST = (process.env.AI_HOST ?? 'ai.pnwoods.com').toLowerCase()

function stripPort(host: string) {
  return host.toLowerCase().split(':')[0]
}

/** True when the request arrived on the dedicated chat subdomain. */
export function isAiHost(host: string | null | undefined) {
  if (!host) return false
  return stripPort(host) === stripPort(AI_HOST)
}

/**
 * Public path prefix for the chat app on the given host:
 * '' on the subdomain (pages live at /, /login), '/ai' on the main domain.
 */
export function aiBasePath(host: string | null | undefined) {
  return isAiHost(host) ? '' : '/ai'
}
