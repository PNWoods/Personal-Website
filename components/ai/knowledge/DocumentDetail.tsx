'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { KnowledgeDocument } from '@/lib/ai/types'

interface ChunkRow {
  id: string
  idx: number
  section: string | null
  content: string
  token_count: number
}

/** Side panel: document metadata, its chunks, and (for notes) an editor. */
export default function DocumentDetail({
  doc,
  isOwner,
  onClose,
  onSaveNote,
}: {
  doc: KnowledgeDocument
  isOwner: boolean
  onClose: () => void
  onSaveNote: (doc: KnowledgeDocument, title: string, content: string) => Promise<void>
}) {
  const supabase = useMemo(() => createClient(), [])
  const [chunks, setChunks] = useState<ChunkRow[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState(doc.content ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(doc.title)
    setContent(doc.content ?? '')
    setEditing(false)
  }, [doc.id, doc.title, doc.content])

  useEffect(() => {
    let cancelled = false
    setChunks(null)
    supabase
      .from('chunks')
      .select('id, idx, section, content, token_count')
      .eq('document_id', doc.id)
      .order('idx', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) setChunks((data as ChunkRow[] | null) ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [supabase, doc.id, doc.status, doc.chunk_count])

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      await onSaveNote(doc, title.trim() || doc.title, content)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col border-l border-white/10 bg-black/40">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{doc.title}</span>
        {isOwner && doc.source_type === 'note' && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
        <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-white/50">
          <dt>Type</dt>
          <dd>{doc.source_type}{doc.mime_type ? ` · ${doc.mime_type}` : ''}</dd>
          <dt>Status</dt>
          <dd>
            {doc.status}
            {doc.status === 'ready' ? ` · ${doc.chunk_count} chunks` : ''}
            {doc.error ? ` · ${doc.error}` : ''}
          </dd>
          {doc.source_url && (
            <>
              <dt>URL</dt>
              <dd className="truncate">
                <a href={doc.source_url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                  {doc.source_url}
                </a>
              </dd>
            </>
          )}
          <dt>Added</dt>
          <dd>{new Date(doc.created_at).toLocaleString()}</dd>
        </dl>

        {editing ? (
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-blue-500"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className="w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-white/60 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !content.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save and re-index'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs uppercase tracking-wide text-white/35">
              Chunks{chunks && chunks.length >= 50 ? ' (first 50)' : ''}
            </p>
            {chunks === null ? (
              <p className="text-white/40">Loading…</p>
            ) : chunks.length === 0 ? (
              <p className="text-white/40">No chunks yet.</p>
            ) : (
              <ol className="space-y-2">
                {chunks.map((c) => (
                  <li key={c.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-white/45">
                      <span className="rounded bg-white/10 px-1.5 tabular-nums">{c.idx + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{c.section ?? '—'}</span>
                      <span className="tabular-nums">{c.token_count}t</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-white/75">
                      {c.content}
                    </pre>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  )
}
