import type { Metadata } from 'next'
import { Github, Linkedin, Mail, Phone } from 'lucide-react'
import { CONTACT } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach Patrick Woods: email, LinkedIn, GitHub and phone.',
  alternates: { canonical: '/contact' },
}

const rows = [
  { icon: Mail, label: CONTACT.email, href: `mailto:${CONTACT.email}` },
  { icon: Linkedin, label: 'linkedin.com/in/pnwoods', href: CONTACT.linkedin, external: true },
  { icon: Github, label: 'github.com/PNWoods', href: CONTACT.github, external: true },
  { icon: Phone, label: CONTACT.phone, href: CONTACT.phoneHref },
]

/** Plain page version of the "Get In Touch" modal, for direct links and search. */
export default function Contact() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Get In Touch</h1>
          <p className="text-lg text-gray-300">
            Email is the quickest way to reach me. I&apos;m open to conversations about data
            platforms, RAG systems, and on-device LLMs.
          </p>
        </div>
        <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm">
          {rows.map(({ icon: Icon, label, href, external }) => (
            <li key={href}>
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-4 px-6 py-4 text-gray-200 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Icon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
