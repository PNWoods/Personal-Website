'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, Globe, Settings2 } from 'lucide-react'
import type { Collection } from '@/lib/ai/types'
import { useAiBase } from './AiBaseProvider'

/**
 * Header control for choosing which knowledge collections the current
 * conversation consults, plus the on-demand web search toggle. Nothing
 * selected means no retrieval at all.
 */
export default function KnowledgePicker({
  userId,
  collections,
  selectedIds,
  webSearch,
  onToggle,
  onToggleWeb,
  disabled,
}: {
  userId: string
  collections: Collection[]
  selectedIds: string[]
  webSearch: boolean
  onToggle: (id: string) => void
  onToggleWeb: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { href } = useAiBase()

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const count = selectedIds.length + (webSearch ? 1 : 0)
  const active = count > 0
  const label = !active ? 'Knowledge' : `${count} selected`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={`flex h-8 items-center gap-1.5 rounded px-2 text-xs hover:bg-white/10 hover:text-white disabled:opacity-40 ${
          active ? 'text-blue-300' : 'text-white/60'
        }`}
        title="Choose which knowledge bases this conversation can search"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {webSearch ? <Globe size={14} /> : <BookOpen size={14} />}
        <span className="hidden sm:inline">{label}</span>
        {active && <span className="sm:hidden">{count}</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-white/15 bg-black/95 p-2 shadow-xl">
          <p className="px-2 pb-2 text-[11px] text-white/40">
            Selected sources are searched for every message. Leave all off for the
            fastest replies.
          </p>
          <button
            type="button"
            onClick={onToggleWeb}
            className="mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white/10"
            title="Run a web search for each message and cite the results. Nothing is stored."
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                webSearch ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/30'
              }`}
            >
              {webSearch && <Check size={12} />}
            </span>
            <Globe size={13} className="shrink-0 opacity-60" />
            <span className="min-w-0 flex-1 truncate">Web search</span>
          </button>
          <div className="my-1 border-t border-white/10" />
          {collections.length === 0 ? (
            <p className="px-2 py-3 text-xs text-white/50">No collections yet.</p>
          ) : (
            <ul className="max-h-64 space-y-0.5 overflow-y-auto">
              {collections.map((c) => {
                const on = selectedIds.includes(c.id)
                const shared = c.is_shared && c.user_id !== userId
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onToggle(c.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white/10"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          on ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/30'
                        }`}
                      >
                        {on && <Check size={12} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {shared && (
                        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                          shared
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <a
            href={href('/knowledge')}
            className="mt-2 flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Settings2 size={13} />
            Manage knowledge
          </a>
        </div>
      )}
    </div>
  )
}
