'use client'

import { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Brain, ChevronRight, Palette, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ACCENTS, DEFAULT_ACCENT, isAccentColor, type AccentColor } from '@/lib/ai/theme'
import type { Memory, UserSettings } from '@/lib/ai/types'
import { useAiBase } from '../AiBaseProvider'
import AppearanceSection from './AppearanceSection'
import MemorySection from './MemorySection'
import PersonalizationSection from './PersonalizationSection'

type SectionId = 'personalization' | 'memory' | 'appearance'

const SECTIONS: { id: SectionId; title: string; blurb: string; icon: React.ReactNode }[] = [
  {
    id: 'personalization',
    title: 'Personalization',
    blurb: 'How replies should look: tables, bullets, length, code language.',
    icon: <SlidersHorizontal size={16} />,
  },
  {
    id: 'memory',
    title: 'Memory',
    blurb: 'What the assistant remembers about you across chats.',
    icon: <Brain size={16} />,
  },
  {
    id: 'appearance',
    title: 'Appearance',
    blurb: 'Message color and accent.',
    icon: <Palette size={16} />,
  },
]

function isSection(v: string | null): v is SectionId {
  return v === 'personalization' || v === 'memory' || v === 'appearance'
}

/**
 * Settings landing page: one row per area; each opens on its own screen
 * (?s=<section>) with a back link, so the page never becomes a long scroll.
 */
export default function SettingsApp({
  userId,
  userEmail,
  initialSettings,
  initialMemories,
}: {
  userId: string
  userEmail: string
  initialSettings: UserSettings | null
  initialMemories: Memory[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { href } = useAiBase()
  const supabase = useMemo(() => createClient(), [])

  const raw = searchParams.get('s')
  const section: SectionId | null = isSection(raw) ? raw : null
  const open = useCallback(
    (id: SectionId | null) => {
      router.replace(id ? `${pathname}?s=${id}` : pathname, { scroll: false })
    },
    [router, pathname]
  )

  const [accent, setAccent] = useState<AccentColor>(
    isAccentColor(initialSettings?.bubble_color) ? initialSettings.bubble_color : DEFAULT_ACCENT
  )
  const [memoryAuto, setMemoryAuto] = useState(initialSettings?.memory_auto !== false)
  const [memoryError, setMemoryError] = useState<string | null>(null)

  async function saveMemoryAuto(on: boolean) {
    setMemoryAuto(on)
    setMemoryError(null)
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, memory_auto: on }, { onConflict: 'user_id' })
    if (error) {
      setMemoryAuto(!on)
      setMemoryError(`Could not save: ${error.message}`)
    }
  }

  const a = ACCENTS[accent]
  const current = SECTIONS.find((s) => s.id === section) ?? null

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-3 md:px-4">
        {current ? (
          <button
            type="button"
            onClick={() => open(null)}
            className="flex h-8 items-center gap-1.5 rounded px-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={14} />
            Settings
          </button>
        ) : (
          <a
            href={href('/')}
            className="flex h-8 items-center gap-1.5 rounded px-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={14} />
            Chat
          </a>
        )}
        <span className="ml-2 text-sm font-medium">{current ? current.title : 'Settings'}</span>
        <span className="ml-auto truncate text-xs text-white/40" title={userEmail}>
          {userEmail}
        </span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {section === null && (
            <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => open(s.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${a.chip}`}>
                      {s.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{s.title}</span>
                      <span className="block truncate text-xs text-white/50">{s.blurb}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-white/40" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {section === 'personalization' && (
            <PersonalizationSection
              userId={userId}
              initialText={initialSettings?.custom_instructions ?? ''}
              accent={a}
            />
          )}

          {section === 'memory' && (
            <>
              <MemorySection
                userId={userId}
                initialMemories={initialMemories}
                memoryAuto={memoryAuto}
                onMemoryAutoChange={saveMemoryAuto}
                accent={a}
              />
              {memoryError && <p className="text-xs text-red-300">{memoryError}</p>}
            </>
          )}

          {section === 'appearance' && (
            <AppearanceSection userId={userId} initialAccent={accent} onSaved={setAccent} />
          )}
        </div>
      </main>
    </div>
  )
}
