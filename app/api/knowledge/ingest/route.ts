import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runIngestStep } from '@/lib/ai/knowledge/ingest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Advance a document's ingestion (extract → chunk → embed). Does bounded work
 * per call; the client keeps calling until `done`. RLS limits this to
 * documents the caller can see, and only owners can write chunks.
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let documentId: unknown
  try {
    ;({ documentId } = (await request.json()) as { documentId?: unknown })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (typeof documentId !== 'string' || !documentId) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const result = await runIngestStep(supabase, documentId, { deadlineMs: 90_000 })
    if (!result) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/knowledge/ingest] failed', err)
    return NextResponse.json({ error: 'Ingestion failed.' }, { status: 500 })
  }
}
