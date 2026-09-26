'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { storagePath } from '@/lib/ai/knowledge/files'
import { DEFAULT_ACCENT, type AccentColor } from '@/lib/ai/theme'
import type { Collection, IngestResponse, KnowledgeDocument } from '@/lib/ai/types'
import { useAiBase } from '../AiBaseProvider'
import AddDocument from './AddDocument'
import CollectionList from './CollectionList'
import DocumentDetail from './DocumentDetail'
import DocumentList from './DocumentList'
import { useIngest } from './useIngest'

const RESUMABLE = new Set(['pending', 'extracting', 'embedding'])

/**
 * Still has work the server can pick up: mid-flight, or failed during the
 * embedding phase with its chunks intact (the server resumes those).
 */
function canResume(d: KnowledgeDocument): boolean {
  if (RESUMABLE.has(d.status)) return true
  return (
    d.status === 'error' &&
    d.chunk_count > 0 &&
    d.embedded_count < d.chunk_count &&
    /^Failed to (store|read) (embeddings|chunks)|embed/i.test(d.error ?? '')
  )
}

export default function KnowledgeApp({
  userId,
  initialCollections,
  initialDocuments,
  accent = DEFAULT_ACCENT,
}: {
  userId: string
  initialCollections: Collection[]
  initialDocuments: KnowledgeDocument[]
  accent?: AccentColor
}) {
  const supabase = useMemo(() => createClient(), [])
  const { href } = useAiBase()
  const searchParams = useSearchParams()
  /** Chunk to scroll to when arriving from a citation (?doc=…&chunk=…). */
  const highlightChunkId = searchParams.get('chunk')

  const [collections, setCollections] = useState(initialCollections)
  const [documents, setDocuments] = useState(initialDocuments)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const deepLinkDoc = searchParams.get('doc')
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const fromDoc = initialDocuments.find((d) => d.id === deepLinkDoc)?.collection_id
    return fromDoc ?? initialCollections.find((c) => c.user_id === userId)?.id ?? initialCollections[0]?.id ?? null
  })
  const [detailId, setDetailId] = useState<string | null>(deepLinkDoc)

  const patchDocument = useCallback((id: string, patch: Partial<KnowledgeDocument>) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }, [])

  const onProgress = useCallback(
    async (r: IngestResponse) => {
      patchDocument(r.documentId, {
        status: r.status,
        chunk_count: r.chunkCount,
        embedded_count: r.embeddedCount,
        error: r.error ?? null,
      })
      if (r.done && r.status === 'ready') {
        // web pages get their real title and stored text during ingestion
        const { data } = await supabase.from('documents').select('*').eq('id', r.documentId).maybeSingle()
        if (data) patchDocument(r.documentId, data as KnowledgeDocument)
      }
    },
    [patchDocument, supabase]
  )
  const { ingest, activeIds } = useIngest(onProgress)

  // Resume anything left mid-flight by a closed tab.
  useEffect(() => {
    for (const d of initialDocuments) {
      if (d.user_id === userId && canResume(d)) ingest(d.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = collections.find((c) => c.id === selectedId) ?? null
  const isOwner = !!selected && selected.user_id === userId
  const docsInSelected = documents.filter((d) => d.collection_id === selectedId)
  const detail = documents.find((d) => d.id === detailId) ?? null
  const counts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const d of documents) out[d.collection_id] = (out[d.collection_id] ?? 0) + 1
    return out
  }, [documents])

  function fail(message: string) {
    setError(message)
    console.error('[knowledge]', message)
  }

  // ---- collections ----------------------------------------------------------
  async function createCollection(name: string) {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: userId, name })
      .select('*')
      .single()
    if (error || !data) return fail(`Could not create collection: ${error?.message}`)
    setCollections((prev) => [...prev, data as Collection].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedId((data as Collection).id)
  }

  async function updateCollection(id: string, patch: Partial<Collection>) {
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    const { error } = await supabase.from('collections').update(patch).eq('id', id)
    if (error) fail(`Could not update collection: ${error.message}`)
  }

  async function deleteCollection(c: Collection) {
    const n = counts[c.id] ?? 0
    if (!window.confirm(`Delete "${c.name}"${n ? ` and its ${n} document${n === 1 ? '' : 's'}` : ''}?`)) return
    setBusy(true)
    try {
      const paths = documents
        .filter((d) => d.collection_id === c.id && d.storage_path)
        .map((d) => d.storage_path as string)
      if (paths.length) await supabase.storage.from('knowledge').remove(paths)
      const { error } = await supabase.from('collections').delete().eq('id', c.id)
      if (error) return fail(`Could not delete collection: ${error.message}`)
      setDocuments((prev) => prev.filter((d) => d.collection_id !== c.id))
      setCollections((prev) => prev.filter((x) => x.id !== c.id))
      setSelectedId((prev) => (prev === c.id ? null : prev))
    } finally {
      setBusy(false)
    }
  }

  // ---- documents ------------------------------------------------------------
  async function addFiles(files: File[]) {
    if (!selected || !isOwner) return
    setError(null)
    setBusy(true)
    try {
      for (const file of files) {
        const id = crypto.randomUUID()
        const path = storagePath(userId, id, file.name)
        const row = {
          id,
          collection_id: selected.id,
          user_id: userId,
          title: file.name,
          source_type: 'file' as const,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          status: 'uploading' as const,
        }
        const { data, error } = await supabase.from('documents').insert(row).select('*').single()
        if (error || !data) {
          fail(`Could not register ${file.name}: ${error?.message}`)
          continue
        }
        setDocuments((prev) => [data as KnowledgeDocument, ...prev])

        const { error: upErr } = await supabase.storage
          .from('knowledge')
          .upload(path, file, { contentType: file.type || undefined, upsert: false })
        if (upErr) {
          await supabase.from('documents').delete().eq('id', id)
          setDocuments((prev) => prev.filter((d) => d.id !== id))
          fail(`Upload failed for ${file.name}: ${upErr.message}`)
          continue
        }
        const { error: stErr } = await supabase.from('documents').update({ status: 'pending' }).eq('id', id)
        if (stErr) {
          fail(`Could not queue ${file.name}: ${stErr.message}`)
          continue
        }
        patchDocument(id, { status: 'pending' })
        ingest(id)
      }
    } finally {
      setBusy(false)
    }
  }

  async function addNote(title: string, content: string) {
    if (!selected || !isOwner) return
    setError(null)
    const { data, error } = await supabase
      .from('documents')
      .insert({
        collection_id: selected.id,
        user_id: userId,
        title,
        source_type: 'note',
        content,
        status: 'pending',
      })
      .select('*')
      .single()
    if (error || !data) return fail(`Could not save note: ${error?.message}`)
    setDocuments((prev) => [data as KnowledgeDocument, ...prev])
    ingest((data as KnowledgeDocument).id)
  }

  async function addUrl(url: string) {
    if (!selected || !isOwner) return
    setError(null)
    const { data, error } = await supabase
      .from('documents')
      .insert({
        collection_id: selected.id,
        user_id: userId,
        title: url,
        source_type: 'url',
        source_url: url,
        status: 'pending',
      })
      .select('*')
      .single()
    if (error || !data) return fail(`Could not add the page: ${error?.message}`)
    setDocuments((prev) => [data as KnowledgeDocument, ...prev])
    ingest((data as KnowledgeDocument).id)
  }

  async function saveNote(doc: KnowledgeDocument, title: string, content: string) {
    const { error } = await supabase
      .from('documents')
      .update({ title, content, status: 'pending', error: null })
      .eq('id', doc.id)
    if (error) return fail(`Could not save note: ${error.message}`)
    patchDocument(doc.id, { title, content, status: 'pending', error: null })
    ingest(doc.id)
  }

  async function reindex(doc: KnowledgeDocument) {
    // A document that died mid-embedding keeps its chunks: just continue.
    if (doc.status === 'error' && canResume(doc)) {
      patchDocument(doc.id, { status: 'embedding', error: null })
      ingest(doc.id)
      return
    }
    const { error } = await supabase
      .from('documents')
      .update({ status: 'pending', error: null })
      .eq('id', doc.id)
    if (error) return fail(`Could not re-index: ${error.message}`)
    patchDocument(doc.id, { status: 'pending', error: null })
    ingest(doc.id)
  }

  async function deleteDocument(doc: KnowledgeDocument) {
    if (!window.confirm(`Delete "${doc.title}"?`)) return
    if (doc.storage_path) {
      const { error } = await supabase.storage.from('knowledge').remove([doc.storage_path])
      if (error) return fail(`Could not delete the file: ${error.message}`)
    }
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) return fail(`Could not delete document: ${error.message}`)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    if (detailId === doc.id) setDetailId(null)
  }

  return (
    <div className="flex h-full w-full">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-white/10 bg-black/40 md:flex">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <a href={href('/')} className="flex h-8 items-center gap-1.5 rounded px-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            <ArrowLeft size={14} />
            Chat
          </a>
          <span className="ml-auto text-sm font-medium">Knowledge</span>
        </div>
        <CollectionList
          userId={userId}
          collections={collections}
          counts={counts}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setDetailId(null)
          }}
          onCreate={createCollection}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-3 md:px-4">
          <a href={href('/')} className="flex h-8 items-center gap-1 rounded px-2 text-sm text-white/70 hover:bg-white/10 md:hidden">
            <ArrowLeft size={14} />
          </a>
          <select
            value={selectedId ?? ''}
            onChange={(e) => {
              setSelectedId(e.target.value || null)
              setDetailId(null)
            }}
            className="h-9 max-w-[60%] rounded-lg border border-white/15 bg-white/5 px-2 text-sm outline-none md:hidden"
          >
            <option value="">Select a collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id} className="bg-black">
                {c.name}
              </option>
            ))}
          </select>
          <span className="hidden truncate text-sm font-medium md:block">
            {selected?.name ?? 'Knowledge'}
          </span>
          {selected && isOwner && (
            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={selected.is_shared}
                  onChange={(e) => updateCollection(selected.id, { is_shared: e.target.checked })}
                  className="h-3.5 w-3.5"
                />
                Shared with everyone
              </label>
              <button
                type="button"
                onClick={() => deleteCollection(selected)}
                disabled={busy}
                className="flex h-8 w-8 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-red-400 disabled:opacity-40"
                title="Delete collection"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          {selected && !isOwner && (
            <span className="ml-auto text-xs text-white/40">shared by another user · read only</span>
          )}
        </header>
        {error && (
          <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs text-red-300">{error}</p>
        )}

        <div className="flex min-h-0 flex-1">
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 md:p-4">
            {!selected ? (
              <p className="text-sm text-white/50">
                {collections.length === 0
                  ? 'Create a collection to start adding documents.'
                  : 'Pick a collection.'}
              </p>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {selected.description && (
                  <p className="text-sm text-white/50">{selected.description}</p>
                )}
                {isOwner && (
                  <AddDocument onFiles={addFiles} onNote={addNote} onUrl={addUrl} busy={busy} />
                )}
                <DocumentList
                  documents={docsInSelected}
                  isOwner={isOwner}
                  activeIds={activeIds}
                  onOpen={(d) => setDetailId(d.id)}
                  onReindex={reindex}
                  onDelete={deleteDocument}
                />
              </div>
            )}
          </main>
          {detail && (
            <div className="hidden w-[28rem] shrink-0 lg:block">
              <DocumentDetail
                doc={detail}
                isOwner={detail.user_id === userId}
                onClose={() => setDetailId(null)}
                onSaveNote={saveNote}
                highlightChunkId={detail.id === deepLinkDoc ? highlightChunkId : null}
                accent={accent}
              />
            </div>
          )}
        </div>
        {detail && (
          <div className="fixed inset-0 z-40 bg-black/95 lg:hidden">
            <DocumentDetail
              doc={detail}
              isOwner={detail.user_id === userId}
              onClose={() => setDetailId(null)}
              onSaveNote={saveNote}
              highlightChunkId={detail.id === deepLinkDoc ? highlightChunkId : null}
              accent={accent}
            />
          </div>
        )}
      </div>
    </div>
  )
}
