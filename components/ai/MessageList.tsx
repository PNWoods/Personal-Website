'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import type { ChatMessage } from '@/lib/ai/types'
import { DEFAULT_ACCENT, type AccentColor } from '@/lib/ai/theme'
import MessageBubble from './MessageBubble'

const BOTTOM_THRESHOLD = 80

export default function MessageList({
  messages,
  model,
  accent = DEFAULT_ACCENT,
}: {
  messages: ChatMessage[]
  model: string | null
  accent?: AccentColor
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distance < BOTTOM_THRESHOLD)
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  // Follow the stream only while the user is already at the bottom.
  useEffect(() => {
    if (atBottom) scrollToBottom('auto')
  }, [messages, atBottom])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-semibold">What can I help with?</h2>
        <p className="mt-2 text-sm text-white/50">
          {model ? `Talking to ${model}` : 'Pick a model to get started'}
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} accent={accent} />
          ))}
        </div>
      </div>
      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute bottom-3 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white/80 shadow hover:text-white"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={16} />
        </button>
      )}
    </div>
  )
}
