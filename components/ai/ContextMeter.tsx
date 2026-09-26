'use client'

import type { ContextUsage } from '@/lib/ai/types'

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n)
}

/** Small "12.4K / 32K" bar showing how full the model's context window is. */
export default function ContextMeter({ usage }: { usage: ContextUsage }) {
  const ratio = Math.min(1, usage.used / usage.limit)
  const color =
    ratio > 0.85 ? 'bg-red-400' : ratio > 0.6 ? 'bg-yellow-400' : 'bg-blue-400'
  const label = `${usage.estimated ? '~' : ''}${fmt(usage.used)} / ${fmt(usage.limit)}`

  return (
    <div
      className="flex items-center gap-2 text-xs text-white/40"
      title={`Context window: ${label} tokens${usage.estimated ? ' (estimate until the next reply)' : ''}. Older messages are compacted automatically past 70%.`}
    >
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="tabular-nums">{label}</span>
    </div>
  )
}
