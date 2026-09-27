import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const PAGES = ['/', '/about', '/skills', '/projects', '/contact']

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
