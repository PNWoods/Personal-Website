import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  compactConversation,
  loadConversation,
  loadHistory,
} from '@/lib/ai/context'
import { OllamaError } from '@/lib/ai/ollama'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Manual compaction (the "Compact" button). */
export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { conversationId?: unknown; model?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { conversationId, model } = body
  if (typeof conversationId !== 'string' || typeof model !== 'string' || !model) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const conversation = await loadConversation(supabase, conversationId)
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }
  const history = await loadHistory(supabase, conversation)

  try {
    const result = await compactConversation(supabase, conversation, history, model)
    console.log(
      `[api/compact] conversation=${conversationId} summarized=${result.summarizedCount} total=${result.conversation.summary_message_count}`
    )
    return NextResponse.json({
      conversation: result.conversation,
      summarizedCount: result.summarizedCount,
    })
  } catch (err) {
    console.error('[api/compact] failed', err)
    const message =
      err instanceof OllamaError ? err.message : 'Compaction failed.'
    const status = err instanceof OllamaError ? err.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
