'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink, FileText, Globe, StickyNote } from 'lucide-react'
import { citationTarget } from '@/lib/ai/citations'
import { ACCENTS, DEFAULT_ACCENT, type AccentColor } from '@/lib/ai/theme'
import type { Source } from '@/lib/ai/types'
import { useAiBase } from './AiBaseProvider'

function Icon({ type }: { type: Source['sourceType'] }) {
  if (type === 'url' || type === 'web') return <Globe size={12} />
  if (type === 'note') return <StickyNote size={12} />
  return <FileText size={12} />
}

/** Numbered sources under an assistant reply; cited ones are highlighted. */
export default function SourcesList({
  sources,
  citedNumbers,
  activeN,
  accent = DEFAULT_ACCENT,
}: {
  sources: Source[]
  /** Numbers that appear as [n] in the reply text. */
  citedNumbers: Set<number>
  /** Source most recently clicked in the text, if any. */
  activeN: number | null
  accent?: AccentColor
}) {
  const [open, setOpen] = useState(false)
  const { href } = useAiBase()
  const a = ACCENTS[accent]
  if (sources.length === 0) return null

  return (
    <div className="not-prose mt-3 rounded-lg border border-white/10 bg-white/[0.03] text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-white/60 hover:text-white"
      >
        <span>
          Sources ({sources.length}){citedNumbers.size ? ` · ${citedNumbers.size} cited` : ''}
        </span>
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="space-y-2 border-t border-white/10 px-3 py-2">
          {sources.map((s) => {
            const cited = citedNumbers.has(s.n)
            const active = activeN === s.n
            const label = s.section ? `${s.title} — ${s.section}` : s.title
            const target = citationTarget(s, href)
            return (
              <li
                key={s.n}
                id={`source-${s.n}`}
                className={`rounded px-2 py-1.5 ${active ? `ring-1 ${a.highlight}` : ''} ${
                  cited ? 'text-white/85' : 'text-white/45'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border px-1.5 text-[11px] font-medium ${
                      cited ? a.pill : 'border-white/15 bg-white/10 text-white/50'
                    }`}
                  >
                    {s.n}
                  </span>
                  <span className="shrink-0 opacity-70">
                    <Icon type={s.sourceType} />
                  </span>
                  <a
                    href={target.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex min-w-0 items-center gap-1 truncate hover:underline"
                    title={`${label}\n${target.external ? 'Opens the page at the cited passage' : 'Opens the note at the cited section'}`}
                  >
                    <span className="truncate">{label}</span>
                    <ExternalLink size={11} className="shrink-0 opacity-60" />
                  </a>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-snug opacity-80">{s.snippet}</p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
