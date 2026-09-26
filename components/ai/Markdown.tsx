'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from 'lucide-react'
import type { Source } from '@/lib/ai/types'
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
}: {
  content: string
  /** When present, [n] markers in the text become clickable citations. */
  sources?: Source[]
  onCite?: (n: number) => void
}) {
  const count = sources?.length ?? 0
  const plugins = useMemo(
    () => (count > 0 ? [remarkGfm, remarkCitations(count)] : [remarkGfm]),
    [count]
  )

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
          a({ node: _node, children, href, ...props }) {
            if (href?.startsWith('cite:')) {
              const n = Number(href.slice(5))
              const src = sources?.[n - 1]
              const title = src
                ? src.section
                  ? `${src.title} › ${src.section}`
                  : src.title
                : `Source ${n}`
              return (
                <sup>
                  <button
                    type="button"
                    onClick={() => onCite?.(n)}
                    title={title}
                    className="not-prose mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-blue-500/25 px-1 text-[10px] font-medium text-blue-200 hover:bg-blue-500/50"
                  >
                    {n}
                  </button>
                </sup>
              )
            }
            return (
              <a {...props} href={href} target="_blank" rel="noreferrer noopener">
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
