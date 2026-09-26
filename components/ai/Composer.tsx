'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { ACCENTS, DEFAULT_ACCENT, type AccentColor } from '@/lib/ai/theme'

const MAX_HEIGHT = 200

export default function Composer({
  disabled,
  streaming,
  onSend,
  onStop,
  accent = DEFAULT_ACCENT,
}: {
  disabled: boolean
  streaming: boolean
  onSend: (text: string) => void
  onStop: () => void
  accent?: AccentColor
}) {
  const a = ACCENTS[accent]
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [text])

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled || streaming) return
    onSend(trimmed)
    setText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const canSend = text.trim().length > 0 && !disabled && !streaming

  return (
    <div className="border-t border-white/10 px-4 pb-4 pt-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className={`mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-white/15 bg-white/5 p-2 ${a.ring}`}
      >
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Select a model to start' : 'Message…'}
          disabled={disabled}
          className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-white placeholder-white/40 outline-none disabled:opacity-50"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25"
            aria-label="Stop generating"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-30 ${a.button}`}
            aria-label="Send"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </form>
      <p className="mt-2 text-center text-[11px] text-white/30">
        Enter to send, Shift+Enter for a new line
      </p>
    </div>
  )
}
