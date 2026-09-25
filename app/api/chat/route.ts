import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ndjsonLines } from '@/lib/ai/ndjson'
import { OllamaError, ollamaFetch } from '@/lib/ai/ollama'
import type { ChatRequestBody, ChatStreamEvent, Role } from '@/lib/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Streaming a long generation. Vercel Hobby allows 300s with Fluid compute.
export const maxDuration = 300

const MAX_MESSAGES = 60
const MAX_CHARS = 100_000
const ROLES: Role[] = ['user', 'assistant', 'system']

interface OllamaChatChunk {
  message?: { role: string; content: string }
  done?: boolean
  done_reason?: string
  eval_count?: number
  error?: string
}

function parseBody(raw: unknown): ChatRequestBody | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Partial<ChatRequestBody>
  if (typeof body.conversationId !== 'string' || !body.conversationId) return null
  if (typeof body.model !== 'string' || !body.model) return null
  if (!Array.isArray(body.messages) || body.messages.length === 0) return null

  const messages = body.messages
    .filter(
      (m) =>
        m &&
        typeof m.content === 'string' &&
        ROLES.includes(m.role as Role)
    )
    .map((m) => ({ role: m.role as Role, content: m.content }))
    .slice(-MAX_MESSAGES)

  let total = 0
  for (const m of messages) total += m.content.length
  if (total > MAX_CHARS) return null

  return { conversationId: body.conversationId, model: body.model, messages }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ChatRequestBody | null = null
  try {
    body = parseBody(await request.json())
  } catch {
    body = null
  }
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { conversationId, model, messages } = body

  const upstreamAbort = new AbortController()
  let upstream: Response
  try {
    upstream = await ollamaFetch('/api/chat', {
      method: 'POST',
      signal: upstreamAbort.signal,
      json: { model, messages, stream: true, keep_alive: '30m' },
    })
  } catch (err) {
    if (err instanceof OllamaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json(
      { error: 'Failed to reach Ollama' },
      { status: 502 }
    )
  }

  if (!upstream.body) {
    return NextResponse.json(
      { error: 'Ollama returned an empty response' },
      { status: 502 }
    )
  }
  const upstreamBody = upstream.body

  const encoder = new TextEncoder()
  let full = ''
  let persisted = false
  let closed = false

  // Save the assistant turn once, whether the stream completed or was cut off.
  async function persist(): Promise<string | null> {
    if (persisted) return null
    persisted = true
    if (!full.trim()) return null
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'assistant', content: full })
      .select('id')
      .single()
    if (error) {
      console.error('[api/chat] failed to persist assistant message', error)
      return null
    }
    return data.id as string
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        if (closed) return
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        for await (const chunk of ndjsonLines<OllamaChatChunk>(upstreamBody)) {
          if (chunk.error) {
            send({ type: 'error', message: chunk.error })
            break
          }
          const content = chunk.message?.content
          if (content) {
            full += content
            send({ type: 'delta', content })
          }
          if (chunk.done) {
            const messageId = await persist()
            send({
              type: 'done',
              messageId,
              done_reason: chunk.done_reason,
              eval_count: chunk.eval_count,
            })
            break
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error('[api/chat] stream error', err)
          try {
            send({
              type: 'error',
              message: 'The connection to Ollama dropped mid-response.',
            })
          } catch {
            // controller already closed
          }
        }
      } finally {
        await persist()
        if (!closed) {
          closed = true
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
      }
    },
    async cancel() {
      // Client disconnected or pressed Stop: stop Ollama, keep the partial reply.
      closed = true
      upstreamAbort.abort()
      await persist()
    },
  })

  // request.signal is unreliable in Next 14 route handlers; cancel() above is
  // the primary path, this is belt and braces.
  request.signal?.addEventListener('abort', () => upstreamAbort.abort())

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
