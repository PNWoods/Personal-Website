'use client'

import { useMemo, useState } from 'react'
import { Brain, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AccentClasses } from '@/lib/ai/theme'
import type { Memory } from '@/lib/ai/types'

/** Settings → Memory: what the assistant remembers about this user. */
export default function MemorySection({
  userId,
  initialMemories,
  memoryAuto,
  onMemoryAutoChange,
  accent,
}: {
  userId: string
  initialMemories: Memory[]
  memoryAuto: boolean
  onMemoryAutoChange: (on: boolean) => Promise<void>
  accent: AccentClasses
}) {
  const supabase = useMemo(() => createClient(), [])
  const [memories, setMemories] = useState(initialMemories)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || busy) return
    setBusy(true)
    setError(null)
    const { data, error } = await supabase
      .from('memories')
      .insert({ user_id: userId, content, kind: 'manual' })
      .select('*')
      .single()
    setBusy(false)
    if (error || !data) return setError(`Could not save: ${error?.message}`)
    setMemories((prev) => [data as Memory, ...prev])
    setDraft('')
  }

  async function saveEdit(m: Memory) {
    const content = editText.trim()
    if (!content || busy) return
    setBusy(true)
    setError(null)
    const { error } = await supabase
      .from('memories')
      .update({ content, kind: 'manual' })
      .eq('id', m.id)
    setBusy(false)
    if (error) return setError(`Could not update: ${error.message}`)
    setMemories((prev) => prev.map((x) => (x.id === m.id ? { ...x, content, kind: 'manual' } : x)))
    setEditingId(null)
  }

  async function remove(m: Memory) {
    setError(null)
    const { error } = await supabase.from('memories').delete().eq('id', m.id)
    if (error) return setError(`Could not delete: ${error.message}`)
    setMemories((prev) => prev.filter((x) => x.id !== m.id))
  }

  async function clearAll() {
    if (!window.confirm(`Forget all ${memories.length} memories?`)) return
    setError(null)
    const { error } = await supabase.from('memories').delete().eq('user_id', userId)
    if (error) return setError(`Could not clear: ${error.message}`)
    setMemories([])
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Brain size={15} className="opacity-70" />
            Memory
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Short facts about you that go into every conversation: your role, tools, projects,
            preferences. Say &ldquo;remember that …&rdquo; in chat to add one directly.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={memoryAuto}
            onChange={(e) => onMemoryAutoChange(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Learn automatically
        </label>
      </div>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Prefers TypeScript examples over Python"
          maxLength={500}
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-sm outline-none placeholder-white/40 focus:border-white/40"
        />
        <button
          type="submit"
          disabled={!draft.trim() || busy}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white disabled:opacity-30 ${accent.button}`}
          aria-label="Add memory"
        >
          <Plus size={16} />
        </button>
      </form>

      {memories.length === 0 ? (
        <p className="mt-4 text-sm text-white/40">Nothing remembered yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10 rounded-lg border border-white/10">
          {memories.map((m) => (
            <li key={m.id} className="flex items-start gap-2 px-3 py-2">
              {editingId === m.id ? (
                <>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveEdit(m)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    maxLength={500}
                    className="h-8 min-w-0 flex-1 rounded border border-white/20 bg-white/5 px-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(m)}
                    className="flex h-8 w-8 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex h-8 w-8 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-white/85">
                    {m.content}
                    <span className="ml-2 align-middle text-[10px] uppercase tracking-wide text-white/30">
                      {m.kind === 'auto' ? 'learned' : 'added'} ·{' '}
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(m.id)
                      setEditText(m.content)
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white"
                    aria-label="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-red-400"
                    aria-label="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-white/40">
        <span>
          {memories.length} of 60 · oldest learned facts are dropped past the cap
        </span>
        {memories.length > 0 && (
          <button type="button" onClick={clearAll} className="hover:text-red-300">
            Forget everything
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </section>
  )
}
