'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from 'lucide-react'
import { citationTarget } from '@/lib/ai/citations'
import { ACCENTS, DEFAULT_ACCENT, type AccentColor } from '@/lib/ai/theme'
import type { Source } from '@/lib/ai/types'
import { useAiBase } from './AiBaseProvider'
import remarkCitations from './remarkCitations'

function CodeBlock({
  language,
  code,
}: {
  language: string | null
  code: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="not-prose my-3 overflow-hidden rounded-lg border border-white/10 bg-black/60">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-white/50">
        <span>{language ?? 'text'}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function Markdown({
  content,
  sources,
  onCite,
  accent = DEFAULT_ACCENT,
}: {
  content: string
  /** When present, [n] markers in the text become clickable citation pills. */
  sources?: Source[]
  onCite?: (n: number) => void
  accent?: AccentColor
}) {
  const { href } = useAiBase()
  const count = sources?.length ?? 0
  const plugins = useMemo(
    () => (count > 0 ? [remarkGfm, remarkCitations(count)] : [remarkGfm]),
    [count]
  )
  const pill = ACCENTS[accent].pill

  return (
    <div className="prose prose-invert prose-sm max-w-none break-words md:prose-base prose-pre:bg-transparent prose-pre:p-0">
      <ReactMarkdown
        remarkPlugins={plugins}
        components={{
          // Fenced blocks arrive as <pre><code className="language-x">.
          pre({ children }) {
            return <>{children}</>
          },
          code({ node: _node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? '')
            const text = String(children).replace(/\n$/, '')
            const isBlock = Boolean(match) || text.includes('\n')
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-white/10 px-1 py-0.5 text-[0.9em] before:content-none after:content-none"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return <CodeBlock language={match?.[1] ?? null} code={text} />
          },
          a({ node: _node, children, href: linkHref, ...props }) {
            if (linkHref?.startsWith('cite:')) {
              const n = Number(linkHref.slice(5))
              const src = sources?.[n - 1]
              if (!src) return <>[{n}]</>
              const target = citationTarget(src, href)
              const title = src.section ? `${src.title} › ${src.section}` : src.title
              return (
                <a
                  href={target.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => onCite?.(n)}
                  title={`${title}\n${target.external ? 'Opens the page at the cited passage' : 'Opens the note at the cited section'}`}
                  className={`not-prose mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 align-text-top text-[11px] font-medium no-underline transition ${pill}`}
                >
                  {n}
                </a>
              )
            }
            return (
              <a {...props} href={linkHref} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
