'use client'

import { useMemo, useState } from 'react'
import type { ChatMessage } from '@/lib/ai/types'
import { ACCENTS, DEFAULT_ACCENT, type AccentColor } from '@/lib/ai/theme'
import Markdown from './Markdown'
import SourcesList from './SourcesList'

const MARKER = /\[(\d{1,3})\]/g

export default function MessageBubble({
  message,
  accent = DEFAULT_ACCENT,
}: {
  message: ChatMessage
  accent?: AccentColor
}) {
  const [activeN, setActiveN] = useState<number | null>(null)
  const sources = message.sources
  const citedNumbers = useMemo(() => {
    const set = new Set<number>()
    if (!sources?.length) return set
    const re = new RegExp(MARKER.source, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(message.content)) !== null) {
      const n = Number(m[1])
      if (n >= 1 && n <= sources.length) set.add(n)
    }
    return set
  }, [message.content, sources])

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border px-4 py-2.5 text-[15px] leading-relaxed ${ACCENTS[accent].bubble}`}
        >
          {message.content}
        </div>
      </div>
    )
  }

  function handleCite(n: number) {
    // The pill itself opens the source in a new tab; here we just mark the
    // matching row in the Sources panel.
    setActiveN(n)
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-full">
        {message.content ? (
          <Markdown content={message.content} sources={sources} onCite={handleCite} accent={accent} />
        ) : message.streaming ? (
          <span className="text-white/50">{message.status ?? 'Thinking…'}</span>
        ) : null}
        {message.streaming && message.content && (
          <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-white/70 align-middle" />
        )}
        {message.error && (
          <p className="mt-2 text-sm text-red-400">{message.error}</p>
        )}
        {sources && sources.length > 0 && (
          <SourcesList
            sources={sources}
            citedNumbers={citedNumbers}
            activeN={activeN}
            accent={accent}
          />
        )}
        {sources && sources.length === 0 && !message.streaming && (
          <p className="mt-2 text-xs text-white/35">No matching knowledge found.</p>
        )}
      </div>
    </div>
  )
}
