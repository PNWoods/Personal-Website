'use client'

import { useMemo, useState } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AccentClasses } from '@/lib/ai/theme'

/** Matches INSTRUCTIONS_MAX_CHARS in lib/ai/context.ts and the DB check. */
const MAX_CHARS = 2000

/** One-click additions; each is a line the user could have typed themselves. */
const QUICK_ADDS: { label: string; text: string }[] = [
  { label: 'Tables for comparisons', text: 'Use a table whenever you compare options, columns, or settings.' },
  { label: 'Bullet points', text: 'Prefer bullet points over paragraphs.' },
  { label: 'Short answers', text: 'Keep answers short; skip preamble and summaries.' },
  { label: 'Step by step', text: 'Explain procedures as numbered steps.' },
  { label: 'Code first', text: 'Lead with the code or command, then a brief explanation.' },
  { label: 'Oracle SQL', text: 'Write SQL examples in Oracle syntax unless told otherwise.' },
  { label: 'TypeScript examples', text: 'Use TypeScript for code examples unless another language is asked for.' },
  { label: 'Ask before assuming', text: 'If a request is ambiguous, ask one clarifying question before answering.' },
]

/** Settings → Personalization: free-text instructions injected into every reply. */
export default function PersonalizationSection({
  userId,
  initialText,
  accent,
}: {
  userId: string
  initialText: string
  accent: AccentClasses
}) {
  const supabase = useMemo(() => createClient(), [])
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(initialText)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)

  const dirty = text !== saved

  function addLine(line: string) {
    setText((prev) => {
      if (prev.includes(line)) return prev
      const sep = prev.trim() ? (prev.endsWith('\n') ? '' : '\n') : ''
      return `${prev}${sep}${line}`.slice(0, MAX_CHARS)
    })
  }

  async function save() {
    if (saving || !dirty) return
    setSaving(true)
    setError(null)
    const value = text.trim().slice(0, MAX_CHARS)
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, custom_instructions: value }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) {
      setError(`Could not save: ${error.message}`)
      return
    }
    setText(value)
    setSaved(value)
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <SlidersHorizontal size={15} className="opacity-70" />
        Personalization
      </h2>
      <p className="mt-1 text-xs text-white/50">
        Tell the assistant how you like replies: tables or bullets, how long, which language
        for code, what to skip. This goes into every conversation, in your own words.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        rows={7}
        maxLength={MAX_CHARS}
        placeholder={
          'e.g. Use a table when comparing options. Keep answers short. Show Oracle SQL, not Postgres. Skip the "great question" fluff.'
        }
        className="mt-4 w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm leading-relaxed outline-none placeholder-white/35 focus:border-white/40"
      />

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/35">Quick adds</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADDS.map((q) => {
            const on = text.includes(q.text)
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => addLine(q.text)}
                disabled={on}
                title={q.text}
                className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition ${
                  on ? `${accent.chip} opacity-70` : 'border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {!on && <Plus size={11} />}
                {q.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 text-xs">
        <span className="mr-auto text-white/35">
          {text.length} / {MAX_CHARS}
        </span>
        {error && <span className="text-red-300">{error}</span>}
        {flash && !error && <span className="text-white/60">Saved</span>}
        {dirty && (
          <button
            type="button"
            onClick={() => setText(saved)}
            className="rounded-lg px-3 py-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            Discard
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-40 ${accent.button}`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  )
}
