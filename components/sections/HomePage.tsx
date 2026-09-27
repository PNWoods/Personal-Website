'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Github, Linkedin } from 'lucide-react'
import { CONTACT, RESUME_PATH } from '@/lib/site'
import { useContactModal } from '../ContactModalProvider'

export default function HomePage() {
  const { showContactModal } = useContactModal()
  return (
    <section className="relative flex min-h-[calc(100vh-9rem)] items-center py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-12 lg:flex-row">
          <div className="flex-shrink-0">
            <div className="h-48 w-48 overflow-hidden rounded-full border-4 border-blue-400/30 shadow-2xl lg:h-64 lg:w-64">
              <Image
                src="/patrick-woods-photo.jpeg"
                alt="Patrick Woods"
                width={256}
                height={256}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left">
            <h1 className="mb-6 text-4xl font-bold text-white sm:text-6xl">
              Hi, I&apos;m
              <span className="block text-blue-400">Patrick Woods</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300 lg:mx-0">
              AI and Data Engineer at Fayetteville PWC and co-founder of RFP Pilot. I build data
              pipelines, RAG systems, and on-device LLM tooling.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/projects"
                className="rounded-lg bg-blue-600 px-8 py-3 text-center text-white transition-colors hover:bg-blue-700"
              >
                View Projects
              </Link>
              <button
                onClick={showContactModal}
                className="rounded-lg border border-blue-400 px-8 py-3 text-blue-400 transition-colors hover:bg-blue-400/10"
              >
                Get In Touch
              </button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-5 lg:justify-start">
              <a
                href={CONTACT.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 transition-colors hover:text-white"
                aria-label="GitHub"
              >
                <Github className="h-6 w-6" />
              </a>
              <a
                href={CONTACT.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 transition-colors hover:text-white"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-6 w-6" />
              </a>
              <a
                href={RESUME_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                Resume ↗
              </a>
              <Link href="/skills" className="text-sm text-gray-400 transition-colors hover:text-white">
                Skills →
              </Link>
            </div>
          </div>
        </div>

        {/* What I'm doing right now */}
        <div className="mx-auto mt-16 max-w-4xl rounded-lg border border-white/15 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-blue-400">Now</p>
          <ul className="grid gap-5 sm:grid-cols-2">
            <li>
              <p className="font-semibold text-white">AI &amp; Data Engineer · Fayetteville PWC</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">
                Data pipelines, RAG and Copilot Studio agents, and AI training for a utility.
              </p>
            </li>
            <li>
              <p className="font-semibold text-white">Co-founder · RFP Pilot</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">
                AI proposal drafting for government and disaster-recovery responders: every
                requirement extracted, every answer grounded in the firm&apos;s own record.{' '}
                <a
                  href="https://rfppilot.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 transition-colors hover:text-blue-300"
                >
                  rfppilot.com
                </a>
              </p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
