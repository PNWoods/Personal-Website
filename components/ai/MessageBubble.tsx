'use client'

import type { ChatMessage } from '@/lib/ai/types'
import Markdown from './Markdown'

export default function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border border-blue-500/30 bg-blue-600/20 px-4 py-2.5 text-[15px] leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-full">
        {message.content ? (
          <Markdown content={message.content} />
        ) : message.streaming ? (
          <span className="text-white/50">Thinking…</span>
        ) : null}
        {message.streaming && message.content && (
          <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-white/70 align-middle" />
        )}
        {message.error && (
          <p className="mt-2 text-sm text-red-400">{message.error}</p>
        )}
      </div>
    </div>
  )
}
