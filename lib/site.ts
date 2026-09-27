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

/** Publications, newest first. Author order as published. */
export const PUBLICATIONS = [
  {
    title: "Don't Waste Bits! Adaptive KV-Cache Quantization for Lightweight On-Device LLMs",
    authors: ['Sayed Pedram Haeri Boroujeni', 'Niloufar Mehrabi', 'Patrick Woods', 'Gabriel Hillesheim', 'Abolfazl Razi'],
    venue: 'LoViF Workshop, IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)',
    year: 2026,
    arxiv: '2604.04722',
    url: 'https://arxiv.org/abs/2604.04722',
    summary:
      'A learned controller that picks 2-, 4-, 8-bit or FP16 precision per token for the KV cache, using lightweight token-level signals, so on-device LLMs spend bits where they matter and cut memory without the accuracy loss of fixed-precision schemes.',
  },
] as const

/** Public pages, in nav order. */
export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/skills', label: 'Skills' },
  { href: '/projects', label: 'Projects' },
] as const
