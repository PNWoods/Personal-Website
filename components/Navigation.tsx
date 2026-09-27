'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS } from '@/lib/site'
import { useContactModal } from './ContactModalProvider'

export default function Navigation() {
  const { showContactModal } = useContactModal()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the mobile menu after navigating.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const linkClass = (href: string) =>
    `transition-colors ${
      pathname === href ? 'text-white' : 'text-gray-300 hover:text-white'
    }`

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="text-2xl font-bold text-white transition-colors hover:text-blue-400">
            Patrick Woods
          </Link>

          {/* Desktop */}
          <div className="hidden items-center space-x-8 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={linkClass(l.href)}
                aria-current={pathname === l.href ? 'page' : undefined}
              >
                {l.label}
              </Link>
            ))}
            <button onClick={showContactModal} className="text-gray-300 transition-colors hover:text-white">
              Contact
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 text-white md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu: overlays the page instead of pushing it down */}
      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-y border-white/10 bg-black/95 backdrop-blur-md md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-2 py-3 text-lg ${linkClass(l.href)}`}
                aria-current={pathname === l.href ? 'page' : undefined}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setOpen(false)
                showContactModal()
              }}
              className="px-2 py-3 text-left text-lg text-gray-300 transition-colors hover:text-white"
            >
              Contact
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
