'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink, FileText, Globe, StickyNote } from 'lucide-react'
import type { Source } from '@/lib/ai/types'
import { useAiBase } from './AiBaseProvider'

function Icon({ type }: { type: Source['sourceType'] }) {
  if (type === 'url') return <Globe size={12} />
  if (type === 'note') return <StickyNote size={12} />
  return <FileText size={12} />
}

/** Numbered sources under an assistant reply; cited ones are highlighted. */
export default function SourcesList({
  sources,
  citedNumbers,
  activeN,
}: {
  sources: Source[]
  /** Numbers that appear as [n] in the reply text. */
  citedNumbers: Set<number>
  /** Source most recently clicked in the text, if any. */
  activeN: number | null
}) {
  const [open, setOpen] = useState(false)
  const { href } = useAiBase()
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
            const link = s.url ?? href(`/knowledge?doc=${s.documentId}`)
            return (
              <li
                key={s.n}
                id={`source-${s.n}`}
                className={`rounded px-2 py-1.5 ${active ? 'bg-blue-500/15 ring-1 ring-blue-500/40' : ''} ${
                  cited ? 'text-white/85' : 'text-white/45'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 tabular-nums">
                    {s.n}
                  </span>
                  <span className="shrink-0 opacity-70">
                    <Icon type={s.sourceType} />
                  </span>
                  <a
                    href={link}
                    target={s.url ? '_blank' : undefined}
                    rel={s.url ? 'noreferrer noopener' : undefined}
                    className="flex min-w-0 items-center gap-1 truncate hover:underline"
                    title={label}
                  >
                    <span className="truncate">{label}</span>
                    {s.url && <ExternalLink size={11} className="shrink-0 opacity-60" />}
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
