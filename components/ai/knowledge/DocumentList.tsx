'use client'

import { FileText, Globe, Loader2, RefreshCw, StickyNote, Trash2 } from 'lucide-react'
import type { KnowledgeDocument } from '@/lib/ai/types'
import { formatBytes } from '@/lib/ai/knowledge/files'

function StatusBadge({ doc, active }: { doc: KnowledgeDocument; active: boolean }) {
  const base = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]'
  switch (doc.status) {
    case 'ready':
      return <span className={`${base} bg-green-500/15 text-green-300`}>ready · {doc.chunk_count} chunks</span>
    case 'error':
      return <span className={`${base} bg-red-500/15 text-red-300`}>error</span>
    case 'embedding':
      return (
        <span className={`${base} bg-blue-500/15 text-blue-300`}>
          {active && <Loader2 size={11} className="animate-spin" />}
          embedding {doc.embedded_count}/{doc.chunk_count}
        </span>
      )
    case 'extracting':
      return (
        <span className={`${base} bg-blue-500/15 text-blue-300`}>
          {active && <Loader2 size={11} className="animate-spin" />}
          extracting
        </span>
      )
    case 'uploading':
      return (
        <span className={`${base} bg-white/10 text-white/60`}>
          <Loader2 size={11} className="animate-spin" />
          uploading
        </span>
      )
    default:
      return (
        <span className={`${base} bg-white/10 text-white/60`}>
          {active && <Loader2 size={11} className="animate-spin" />}
          queued
        </span>
      )
  }
}

function Icon({ doc }: { doc: KnowledgeDocument }) {
  if (doc.source_type === 'url') return <Globe size={14} />
  if (doc.source_type === 'note') return <StickyNote size={14} />
  return <FileText size={14} />
}

export default function DocumentList({
  documents,
  isOwner,
  activeIds,
  onOpen,
  onReindex,
  onDelete,
}: {
  documents: KnowledgeDocument[]
  isOwner: boolean
  activeIds: Set<string>
  onOpen: (doc: KnowledgeDocument) => void
  onReindex: (doc: KnowledgeDocument) => void
  onDelete: (doc: KnowledgeDocument) => void
}) {
  if (documents.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-white/40">
        No documents yet.{isOwner ? ' Upload files or write a note above.' : ''}
      </p>
    )
  }
  return (
    <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
      {documents.map((doc) => {
        const active = activeIds.has(doc.id)
        return (
          <li key={doc.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="shrink-0 text-white/50">
              <Icon doc={doc} />
            </span>
            <button
              type="button"
              onClick={() => onOpen(doc)}
              className="min-w-0 flex-1 text-left"
              title="Open"
            >
              <span className="block truncate text-sm text-white/90 hover:underline">{doc.title}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/40">
                <StatusBadge doc={doc} active={active} />
                {doc.size_bytes ? <span>{formatBytes(doc.size_bytes)}</span> : null}
                {doc.status === 'error' && doc.error && (
                  <span className="text-red-300/80">{doc.error}</span>
                )}
              </span>
            </button>
            {isOwner && (
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onReindex(doc)}
                  disabled={active || doc.status === 'uploading'}
                  className="flex h-8 w-8 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30"
                  title="Re-index"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(doc)}
                  disabled={active}
                  className="flex h-8 w-8 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-red-400 disabled:opacity-30"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
