import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Private areas are kept out of search by X-Robots-Tag headers in
// middleware.ts, not by listing them here (a disallow line advertises them).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
