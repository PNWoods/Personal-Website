import Link from 'next/link'
import { Github, Linkedin, Lock, Mail } from 'lucide-react'
import { CONTACT } from '@/lib/site'

export default function Footer() {
  const year = new Date().getFullYear()
  const iconClass = 'text-gray-400 transition-colors hover:text-white'
  return (
    <footer className="border-t border-white/10 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-gray-400">© {year} Patrick Woods</p>
        <div className="flex items-center gap-5">
          <Link href="/contact" className="text-sm text-gray-400 transition-colors hover:text-white">
            Contact
          </Link>
          <a
            href="https://ai.pnwoods.com"
            className="inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white"
            title="Private AI workspace (invite only)"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden />
            AI chat
          </a>
          <a href={CONTACT.github} target="_blank" rel="noopener noreferrer" className={iconClass} aria-label="GitHub">
            <Github className="h-5 w-5" />
          </a>
          <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer" className={iconClass} aria-label="LinkedIn">
            <Linkedin className="h-5 w-5" />
          </a>
          <a href={`mailto:${CONTACT.email}`} className={iconClass} aria-label="Email">
            <Mail className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
