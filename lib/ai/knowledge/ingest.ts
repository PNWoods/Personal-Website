import 'server-only'

import type { createClient } from '@/lib/supabase/server'
import type { IngestResponse, KnowledgeDocument } from '../types'
import { chunkMarkdown } from './chunk'
import { EMBED_MODEL, embedInput, embedTexts } from './embed'
import { extractFile, type Extracted } from './extract'
import { htmlToMarkdown, pageTitle } from './extract/html'
import { extractPdf } from './extract/pdf'
import { fetchUrl } from './fetchUrl'
import { detectKind } from './files'

type Db = ReturnType<typeof createClient>

/** Chunks embedded per Ollama call. */
const EMBED_BATCH = 32
/** Chunk rows inserted per statement. */
const INSERT_BATCH = 100
/** An `extracting` claim older than this is assumed dead (function timed out). */
const STALE_CLAIM_MS = 5 * 60_000

async function getDocument(db: Db, id: string): Promise<KnowledgeDocument | null> {
  const { data } = await db.from('documents').select('*').eq('id', id).maybeSingle()
  return (data as KnowledgeDocument | null) ?? null
}

async function updateDocument(
  db: Db,
  id: string,
  patch: Partial<KnowledgeDocument>
): Promise<KnowledgeDocument> {
  const { data, error } = await db
    .from('documents')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) throw new Error(`Failed to update document: ${error?.message}`)
  return data as KnowledgeDocument
}

export function toResponse(doc: KnowledgeDocument): IngestResponse {
  return {
    documentId: doc.id,
    status: doc.status,
    chunkCount: doc.chunk_count,
    embeddedCount: doc.embedded_count,
    error: doc.error ?? undefined,
    done: doc.status === 'ready' || doc.status === 'error',
  }
}

/**
 * Turn a document into chunk drafts (plus text/title worth persisting).
 * Notes are chunked from `content`; files are downloaded from the private
 * bucket (as the owner, under storage RLS) and handed to the extractor for
 * their kind; web pages are fetched with SSRF guards. Images and web pages
 * keep their extracted text in `content` so a re-index is cheap and offline.
 */
async function extractDocument(
  db: Db,
  doc: KnowledgeDocument,
  signal?: AbortSignal
): Promise<Extracted & { title?: string }> {
  if (doc.source_type === 'note') {
    return { chunks: chunkMarkdown(doc.content ?? '') }
  }

  if (doc.source_type === 'file') {
    if (!doc.storage_path) throw new Error('The file was never uploaded.')
    const kind = detectKind(doc.storage_path, doc.mime_type)
    if (!kind) throw new Error(`Unsupported file type: ${doc.storage_path.split('/').pop()}`)
    if (kind === 'image' && doc.content) {
      // transcription already done; re-index without calling the vision model
      return { chunks: chunkMarkdown(doc.content) }
    }
    const { data, error } = await db.storage.from('knowledge').download(doc.storage_path)
    if (error || !data) throw new Error(`Could not download the file: ${error?.message ?? 'unknown'}`)
    const buffer = new Uint8Array(await data.arrayBuffer())
    return extractFile(kind, buffer, { signal })
  }

  if (doc.source_type === 'url') {
    if (!doc.source_url) throw new Error('No URL on this document.')
    if (doc.content) return { chunks: chunkMarkdown(doc.content) }
    const fetched = await fetchUrl(doc.source_url, { signal })
    const ct = fetched.contentType
    if (ct.includes('text/html') || ct.includes('application/xhtml')) {
      const html = new TextDecoder('utf-8').decode(fetched.body)
      const content = htmlToMarkdown(html)
      const title = pageTitle(html) ?? undefined
      return { chunks: chunkMarkdown(content), content, title }
    }
    if (ct.includes('application/pdf')) {
      return { chunks: await extractPdf(fetched.body) }
    }
    if (ct.startsWith('text/') || ct.includes('json') || ct === '') {
      const content = new TextDecoder('utf-8').decode(fetched.body)
      return { chunks: chunkMarkdown(content), content }
    }
    throw new Error(`Unsupported content type from that URL: ${ct || 'unknown'}`)
  }

  throw new Error(`Source type "${doc.source_type}" is not supported.`)
}

/**
 * Advance a document's ingestion by up to `deadlineMs` of work and report
 * progress. Idempotent and resumable: the browser calls it until `done`.
 *
 *   pending → extracting → embedding → ready
 *                 ↘ error ↙
 */
export async function runIngestStep(
  db: Db,
  documentId: string,
  opts: { deadlineMs?: number; signal?: AbortSignal } = {}
): Promise<IngestResponse | null> {
  const deadline = Date.now() + (opts.deadlineMs ?? 90_000)
  let doc = await getDocument(db, documentId)
  if (!doc) return null

  // A crashed invocation leaves the row claimed; take it back after a while.
  if (
    doc.status === 'extracting' &&
    Date.now() - Date.parse(doc.updated_at) > STALE_CLAIM_MS
  ) {
    doc = await updateDocument(db, doc.id, { status: 'pending' })
  }

  if (doc.status === 'pending') {
    const { data: claimed } = await db
      .from('documents')
      .update({ status: 'extracting', error: null })
      .eq('id', doc.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()
    if (!claimed) {
      // Another call took it; report whatever state it is in now.
      const now = await getDocument(db, doc.id)
      return now ? toResponse(now) : null
    }
    doc = claimed as KnowledgeDocument

    try {
      const extracted = await extractDocument(db, doc, opts.signal)
      const drafts = extracted.chunks
      if (drafts.length === 0) {
        throw new Error(
          doc.source_type === 'file' && /\.pdf$/i.test(doc.storage_path ?? '')
            ? 'No text could be extracted; this PDF looks scanned (image only).'
            : 'No text could be extracted.'
        )
      }

      const { error: delError } = await db.from('chunks').delete().eq('document_id', doc.id)
      if (delError) throw new Error(`Failed to clear old chunks: ${delError.message}`)

      for (let i = 0; i < drafts.length; i += INSERT_BATCH) {
        const rows = drafts.slice(i, i + INSERT_BATCH).map((c) => ({
          document_id: doc!.id,
          collection_id: doc!.collection_id,
          idx: c.idx,
          section: c.section,
          content: c.content,
          token_count: c.tokenCount,
        }))
        const { error } = await db.from('chunks').insert(rows)
        if (error) throw new Error(`Failed to insert chunks: ${error.message}`)
      }

      doc = await updateDocument(db, doc.id, {
        status: 'embedding',
        chunk_count: drafts.length,
        embedded_count: 0,
        embedding_model: EMBED_MODEL,
        ...(extracted.content !== undefined ? { content: extracted.content } : {}),
        ...(extracted.title && (doc.title === doc.source_url || !doc.title)
          ? { title: extracted.title }
          : {}),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed.'
      console.error(`[ingest] extract failed document=${doc.id}`, err)
      doc = await updateDocument(db, doc.id, { status: 'error', error: message.slice(0, 500) })
      return toResponse(doc)
    }
  }

  if (doc.status === 'embedding') {
    try {
      while (Date.now() < deadline) {
        const { data: pending, error } = await db
          .from('chunks')
          .select('id, section, content')
          .eq('document_id', doc.id)
          .is('embedding', null)
          .order('idx', { ascending: true })
          .limit(EMBED_BATCH)
        if (error) throw new Error(`Failed to read chunks: ${error.message}`)
        const batch = (pending ?? []) as { id: string; section: string | null; content: string }[]

        if (batch.length === 0) {
          doc = await updateDocument(db, doc.id, {
            status: 'ready',
            embedded_count: doc.chunk_count,
            error: null,
          })
          break
        }

        const vectors = await embedTexts(
          batch.map((c) => embedInput(doc!.title, c.section, c.content)),
          { kind: 'document', signal: opts.signal }
        )
        const results = await Promise.all(
          batch.map((c, i) =>
            db.from('chunks').update({ embedding: JSON.stringify(vectors[i]) }).eq('id', c.id)
          )
        )
        const failed = results.find((r) => r.error)
        if (failed?.error) throw new Error(`Failed to store embeddings: ${failed.error.message}`)

        doc = await updateDocument(db, doc.id, {
          embedded_count: Math.min(doc.chunk_count, doc.embedded_count + batch.length),
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Embedding failed.'
      console.error(`[ingest] embed failed document=${doc.id}`, err)
      doc = await updateDocument(db, doc.id, { status: 'error', error: message.slice(0, 500) })
    }
  }

  return toResponse(doc)
}
