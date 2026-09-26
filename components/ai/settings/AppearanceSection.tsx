'use client'

import { useMemo, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ACCENTS,
  ACCENT_COLORS,
  ACCENT_STORAGE_KEY,
  type AccentColor,
} from '@/lib/ai/theme'

/** Settings → Appearance: the message/accent color (skills-page palette). */
export default function AppearanceSection({
  userId,
  initialAccent,
  onSaved,
}: {
  userId: string
  initialAccent: AccentColor
  /** Lets the parent re-tint the rest of the settings UI once saved. */
  onSaved: (accent: AccentColor) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [accent, setAccent] = useState<AccentColor>(initialAccent)
  const [saved, setSaved] = useState<AccentColor>(initialAccent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const a = ACCENTS[accent]

  async function save() {
    if (saving || accent === saved) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, bubble_color: accent }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) {
      setError(`Could not save: ${error.message}`)
      return
    }
    setSaved(accent)
    onSaved(accent)
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent)
    } catch {
      // storage unavailable
    }
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Palette size={15} className="opacity-70" />
        Message color
      </h2>
      <p className="mt-1 text-xs text-white/50">
        The color of your own messages, the send button, citation pills and the input
        highlight. Same palette as the skill tags on pnwoods.com.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {ACCENT_COLORS.map((c) => {
          const on = c === accent
          return (
            <button
              key={c}
              type="button"
              onClick={() => setAccent(c)}
              className={`flex h-10 items-center justify-center gap-2 rounded-full border text-sm capitalize ${ACCENTS[c].chip} ${
                on ? 'ring-2 ring-white/70' : 'hover:brightness-125'
              }`}
              aria-pressed={on}
            >
              {on && <Check size={14} />}
              {c}
            </button>
          )
        })}
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/40 p-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-white/35">Preview</p>
        <div className="flex justify-end">
          <div className={`max-w-[85%] rounded-2xl border px-4 py-2.5 text-[15px] leading-relaxed ${a.bubble}`}>
            Which table links a person to an account?
          </div>
        </div>
        <div className="mt-2 text-[15px] leading-relaxed text-white/85">
          CI_ACCT_PER links persons to accounts{' '}
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 align-text-top text-[11px] font-medium ${a.pill}`}
          >
            1
          </span>
          .
        </div>
        <div className={`mt-3 flex items-end gap-2 rounded-2xl border border-white/15 bg-white/5 p-2 ${a.ring}`}>
          <div className="flex-1 px-2 py-2 text-[15px] text-white/40">Message…</div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${a.button}`}>
            ↑
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {error && <span className="text-xs text-red-300">{error}</span>}
        {flash && !error && <span className="text-xs text-white/60">Saved</span>}
        <button
          type="button"
          onClick={save}
          disabled={saving || accent === saved}
          className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-40 ${a.button}`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  )
}
