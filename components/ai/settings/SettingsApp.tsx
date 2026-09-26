'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ACCENTS,
  ACCENT_COLORS,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  isAccentColor,
  type AccentColor,
} from '@/lib/ai/theme'
import type { UserSettings } from '@/lib/ai/types'
import { useAiBase } from '../AiBaseProvider'

export default function SettingsApp({
  userId,
  userEmail,
  initialSettings,
}: {
  userId: string
  userEmail: string
  initialSettings: UserSettings | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const { href } = useAiBase()
  const initial = isAccentColor(initialSettings?.bubble_color)
    ? initialSettings.bubble_color
    : DEFAULT_ACCENT
  const [accent, setAccent] = useState<AccentColor>(initial)
  const [saved, setSaved] = useState<AccentColor>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)

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
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent)
    } catch {
      // storage unavailable
    }
    setFlash(true)
    setTimeout(() => setFlash(false), 1500)
  }

  const a = ACCENTS[accent]

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-3 md:px-4">
        <a
          href={href('/')}
          className="flex h-8 items-center gap-1.5 rounded px-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={14} />
          Chat
        </a>
        <span className="ml-2 text-sm font-medium">Settings</span>
        <span className="ml-auto truncate text-xs text-white/40" title={userEmail}>
          {userEmail}
        </span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-medium">Message color</h2>
            <p className="mt-1 text-xs text-white/50">
              The color of your own messages, the send button and the input highlight. Same
              palette as the skill tags on pnwoods.com.
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
                <div
                  className={`max-w-[85%] rounded-2xl border px-4 py-2.5 text-[15px] leading-relaxed ${a.bubble}`}
                >
                  Which table links a person to an account?
                </div>
              </div>
              <div className="mt-2 text-[15px] leading-relaxed text-white/85">
                CI_ACCT_PER links persons to accounts.
              </div>
              <div
                className={`mt-3 flex items-end gap-2 rounded-2xl border border-white/15 bg-white/5 p-2 ${a.ring}`}
              >
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
        </div>
      </main>
    </div>
  )
}
