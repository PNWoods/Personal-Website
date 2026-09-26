'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, Globe, Settings2, Sparkles } from 'lucide-react'
import type { Collection } from '@/lib/ai/types'
import { useAiBase } from './AiBaseProvider'

/**
 * Header control for what the current conversation may search: an Auto mode
 * (all visible collections, relevance gate decides per message), explicit
 * collections, and the on-demand web search. Nothing on means no retrieval.
 */
export default function KnowledgePicker({
  userId,
  collections,
  selectedIds,
  knowledgeAuto,
  webSearch,
  onToggle,
  onToggleAuto,
  onToggleWeb,
  disabled,
}: {
  userId: string
  collections: Collection[]
  selectedIds: string[]
  knowledgeAuto: boolean
  webSearch: boolean
  onToggle: (id: string) => void
  onToggleAuto: () => void
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

  const active = knowledgeAuto || webSearch || selectedIds.length > 0
  const label = knowledgeAuto
    ? webSearch
      ? 'Auto + web'
      : 'Auto'
    : selectedIds.length + (webSearch ? 1 : 0) > 0
      ? `${selectedIds.length + (webSearch ? 1 : 0)} selected`
      : 'Knowledge'

  const Row = ({
    on,
    icon,
    text,
    hint,
    onClick,
    dim,
  }: {
    on: boolean
    icon: React.ReactNode
    text: string
    hint?: string
    onClick: () => void
    dim?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white/10 ${dim ? 'opacity-50' : ''}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          on ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/30'
        }`}
      >
        {on && <Check size={12} />}
      </span>
      <span className="shrink-0 opacity-60">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{text}</span>
    </button>
  )

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={`flex h-8 items-center gap-1.5 rounded px-2 text-xs hover:bg-white/10 hover:text-white disabled:opacity-40 ${
          active ? 'text-blue-300' : 'text-white/60'
        }`}
        title="Choose what this conversation can search"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {knowledgeAuto ? <Sparkles size={14} /> : webSearch ? <Globe size={14} /> : <BookOpen size={14} />}
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-white/15 bg-black/95 p-2 shadow-xl">
          <p className="px-2 pb-2 text-[11px] text-white/40">
            Auto searches every knowledge base you can see and only uses excerpts that
            actually match the question. Leave everything off for the fastest replies.
          </p>
          <Row
            on={knowledgeAuto}
            icon={<Sparkles size={13} />}
            text="Auto: all knowledge, when relevant"
            hint="Searches all your collections and keeps only excerpts that clear the relevance gate"
            onClick={onToggleAuto}
          />
          <Row
            on={webSearch}
            icon={<Globe size={13} />}
            text="Web search"
            hint="Run a web search for each message and cite the results. Nothing is stored."
            onClick={onToggleWeb}
          />
          <div className="my-1 border-t border-white/10" />
          {collections.length === 0 ? (
            <p className="px-2 py-3 text-xs text-white/50">No collections yet.</p>
          ) : (
            <ul className="max-h-64 space-y-0.5 overflow-y-auto">
              {collections.map((c) => {
                const shared = c.is_shared && c.user_id !== userId
                return (
                  <li key={c.id}>
                    <Row
                      on={selectedIds.includes(c.id)}
                      icon={<BookOpen size={13} />}
                      text={c.name + (shared ? '  (shared)' : '')}
                      hint={knowledgeAuto ? 'Already covered by Auto' : undefined}
                      onClick={() => onToggle(c.id)}
                      dim={knowledgeAuto}
                    />
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
