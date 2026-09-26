'use client'

import type { ModelInfo } from '@/lib/ai/types'

export type OllamaStatus = 'checking' | 'online' | 'offline'

export default function ModelSelect({
  models,
  value,
  status,
  statusMessage,
  onChange,
  onRefresh,
}: {
  models: ModelInfo[]
  value: string | null
  status: OllamaStatus
  statusMessage: string | null
  onChange: (model: string) => void
  onRefresh: () => void
}) {
  const dotClass =
    status === 'online'
      ? 'bg-green-400'
      : status === 'offline'
        ? 'bg-red-400'
        : 'bg-yellow-400 animate-pulse'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
          {status === 'online'
            ? 'Ollama online'
            : status === 'offline'
              ? 'Ollama offline'
              : 'Checking Ollama…'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded px-1.5 py-0.5 hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={models.length === 0}
        className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
      >
        {models.length === 0 && <option value="">No models</option>}
        {models.map((m) => (
          <option key={m.name} value={m.name} className="bg-black">
            {m.name}
            {m.parameterSize ? ` (${m.parameterSize})` : ''}
          </option>
        ))}
      </select>
      {statusMessage && (
        <p className="text-xs leading-snug text-red-400">{statusMessage}</p>
      )}
    </div>
  )
}
