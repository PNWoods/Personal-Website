'use client'

import { useEffect, useRef, useState } from 'react'
import { Github, Linkedin, Mail, Phone, X } from 'lucide-react'
import { CONTACT } from '@/lib/site'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
}

const rows = [
  { icon: Mail, label: CONTACT.email, href: `mailto:${CONTACT.email}` },
  { icon: Linkedin, label: 'LinkedIn', href: CONTACT.linkedin, external: true },
  { icon: Github, label: 'GitHub', href: CONTACT.github, external: true },
  { icon: Phone, label: CONTACT.phone, href: CONTACT.phoneHref },
]

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [mounted, setMounted] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    closeRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="w-full max-w-md rounded-lg border border-white/20 bg-white/10 p-8 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 id="contact-modal-title" className="text-2xl font-bold text-white">
            Get In Touch
          </h3>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {rows.map(({ icon: Icon, label, href, external }) => (
            <div key={href} className="flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="text-gray-300 transition-colors hover:text-white"
              >
                {label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
