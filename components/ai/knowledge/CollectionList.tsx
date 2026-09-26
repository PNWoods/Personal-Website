'use client'

import { useState } from 'react'
import { BookOpen, Plus, Users } from 'lucide-react'
import type { Collection } from '@/lib/ai/types'

export default function CollectionList({
  userId,
  collections,
  counts,
  selectedId,
  onSelect,
  onCreate,
}: {
  userId: string
  collections: Collection[]
  /** document counts per collection id */
  counts: Record<string, number>
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const mine = collections.filter((c) => c.user_id === userId)
  const shared = collections.filter((c) => c.user_id !== userId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      await onCreate(trimmed)
      setName('')
    } finally {
      setCreating(false)
    }
  }

  function Row({ c }: { c: Collection }) {
    const active = c.id === selectedId
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(c.id)}
          className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm ${
            active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
          }`}
        >
          <BookOpen size={14} className="shrink-0 opacity-60" />
          <span className="min-w-0 flex-1 truncate">{c.name}</span>
          {c.is_shared && c.user_id === userId && (
            <Users size={12} className="shrink-0 opacity-50" aria-label="Shared" />
          )}
          <span className="shrink-0 text-xs tabular-nums text-white/40">{counts[c.id] ?? 0}</span>
        </button>
      </li>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <form onSubmit={submit} className="flex gap-2 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New collection…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-sm outline-none placeholder-white/40 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!name.trim() || creating}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-30"
          aria-label="Create collection"
        >
          <Plus size={16} />
        </button>
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <p className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wide text-white/35">
          My collections
        </p>
        {mine.length === 0 ? (
          <p className="px-3 py-2 text-sm text-white/40">None yet. Create one above.</p>
        ) : (
          <ul className="space-y-0.5">
            {mine.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </ul>
        )}
        {shared.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-4 text-[11px] uppercase tracking-wide text-white/35">
              Shared with me
            </p>
            <ul className="space-y-0.5">
              {shared.map((c) => (
                <Row key={c.id} c={c} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
