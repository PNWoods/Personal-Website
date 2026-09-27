/** Site-wide constants for pnwoods.com (public pages only). */

export const SITE_URL = 'https://pnwoods.com'
export const SITE_NAME = 'Patrick Woods'
export const SITE_TITLE = 'Patrick Woods — AI & Data Engineer'
export const SITE_DESCRIPTION =
  'Personal website of Patrick Woods, AI and Data Engineer building data systems, RAG agents, and on-device LLM research.'

export const CONTACT = {
  email: 'woods.patrick@icloud.com',
  phone: '(828) 507-7667',
  phoneHref: 'tel:+18285077667',
  linkedin: 'https://www.linkedin.com/in/pnwoods/',
  github: 'https://github.com/PNWoods',
} as const

/** Public pages, in nav order. */
export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/skills', label: 'Skills' },
  { href: '/projects', label: 'Projects' },
] as const
