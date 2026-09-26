import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ndjsonLines } from '@/lib/ai/ndjson'
import { OllamaError, ollamaFetch } from '@/lib/ai/ollama'
import {
  NUM_CTX,
  buildPrompt,
  compactConversation,
  loadConversation,
  loadHistory,
  needsCompaction,
  trimToFit,
} from '@/lib/ai/context'
import { retrieveSources, type Retrieval } from '@/lib/ai/knowledge/retrieve'
import type { ChatRequestBody, ChatStreamEvent, Message } from '@/lib/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Streaming a long generation. Vercel Hobby allows 300s with Fluid compute.
export const maxDuration = 300

interface OllamaChatChunk {
  message?: { role: string; content: string }
  done?: boolean
  done_reason?: string
  eval_count?: number
  prompt_eval_count?: number
  error?: string
}

function parseBody(raw: unknown): ChatRequestBody | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as Partial<ChatRequestBody>
  if (typeof body.conversationId !== 'string' || !body.conversationId) return null
  if (typeof body.model !== 'string' || !body.model) return null
  const message =
    typeof body.message === 'string' && body.message.trim()
      ? body.message
      : undefined
  return { conversationId: body.conversationId, model: body.model, message }
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
  const { conversationId, model } = body

  // The server owns the prompt: history comes from the database (RLS scopes it
  // to this user), not from the client.
  let conversation = await loadConversation(supabase, conversationId)
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }
  let history = await loadHistory(supabase, conversation)

  // The client saves the user turn before calling us. If that insert failed,
  // recover by saving it here so the model still sees the question.
  const last = history[history.length - 1]
  if (body.message && !(last?.role === 'user' && last.content === body.message)) {
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'user', content: body.message })
      .select('*')
      .single()
    if (data) history.push(data as Message)
  }
  if (history.length === 0) {
    return NextResponse.json({ error: 'Nothing to send' }, { status: 400 })
  }

  const upstreamAbort = new AbortController()
  const encoder = new TextEncoder()
  let full = ''
  let persisted = false
  let closed = false
  // Knowledge-base excerpts for this turn (null when no collection is selected).
  let knowledge: Retrieval | null = null

  // Save the assistant turn once, whether the stream completed or was cut off.
  async function persist(): Promise<string | null> {
    if (persisted) return null
    persisted = true
    if (!full.trim()) return null
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: full,
        sources: knowledge ? knowledge.sources : null,
      })
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
      const fail = (message: string) => {
        try {
          send({ type: 'error', message })
        } catch {
          // controller already closed
        }
      }

      let chunks = 0
      let finished = false
      try {
        // 1. Retrieve knowledge-base excerpts for the latest user turn, if the
        //    conversation has collections selected.
        const lastUser = history[history.length - 1]
        if (conversation!.collection_ids?.length && lastUser?.role === 'user') {
          send({ type: 'status', message: 'Searching knowledge…' })
          try {
            knowledge = await retrieveSources(supabase, {
              query: lastUser.content,
              collectionIds: conversation!.collection_ids,
              signal: upstreamAbort.signal,
            })
            console.log(
              `[api/chat] retrieved conversation=${conversationId} collections=${conversation!.collection_ids.length} sources=${knowledge.sources.length}`
            )
            send({ type: 'sources', sources: knowledge.sources })
          } catch (err) {
            if ((err as Error)?.name === 'AbortError') throw err
            console.error('[api/chat] retrieval failed, answering without sources', err)
            send({ type: 'status', message: 'Knowledge search failed; answering without sources…' })
            knowledge = null
          }
        }

        // 2. Fit the prompt into the window, compacting older turns if needed.
        let prompt = buildPrompt(conversation!, history, { knowledge: knowledge?.block })
        if (needsCompaction(prompt, history.length)) {
          send({ type: 'status', message: 'Compacting earlier messages…' })
          try {
            const result = await compactConversation(
              supabase,
              conversation!,
              history,
              model,
              { signal: upstreamAbort.signal }
            )
            conversation = result.conversation
            history = result.history
            prompt = buildPrompt(conversation, history, { knowledge: knowledge?.block })
            console.log(
              `[api/chat] compacted conversation=${conversationId} summarized=${result.summarizedCount} total=${conversation.summary_message_count}`
            )
            send({
              type: 'compacted',
              summarizedCount: result.summarizedCount,
              summaryMessageCount: conversation.summary_message_count,
              summaryUpto: conversation.summary_upto ?? '',
            })
          } catch (err) {
            if ((err as Error)?.name === 'AbortError') throw err
            // Fall back to trimming so the user still gets an answer.
            console.error('[api/chat] compaction failed, trimming instead', err)
          }
        }
        prompt = trimToFit(prompt)

        // 3. Stream the reply.
        send({ type: 'status', message: 'Thinking…' })
        let upstream: Response
        try {
          upstream = await ollamaFetch('/api/chat', {
            method: 'POST',
            signal: upstreamAbort.signal,
            json: {
              model,
              messages: prompt,
              stream: true,
              // think: false keeps thinking-capable models (qwen3.6) from
              // spending the budget on hidden reasoning this stream does not
              // surface. keep_alive: the model unloads after 30 idle minutes
              // to save power overnight (a per-request value overrides the
              // host's OLLAMA_KEEP_ALIVE).
              think: false,
              keep_alive: '30m',
              options: { num_ctx: NUM_CTX },
            },
          })
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') throw err
          fail(err instanceof OllamaError ? err.message : 'Failed to reach Ollama')
          finished = true
          return
        }
        if (!upstream.body) {
          fail('Ollama returned an empty response')
          finished = true
          return
        }

        for await (const chunk of ndjsonLines<OllamaChatChunk>(upstream.body)) {
          chunks++
          if (chunk.error) {
            console.error('[api/chat] ollama error chunk', chunk.error)
            fail(chunk.error)
            finished = true
            break
          }
          const content = chunk.message?.content
          if (content) {
            full += content
            send({ type: 'delta', content })
          }
          if (chunk.done) {
            finished = true
            const messageId = await persist()
            console.log(
              `[api/chat] done model=${model} chunks=${chunks} chars=${full.length} prompt=${chunk.prompt_eval_count ?? '-'} eval=${chunk.eval_count ?? '-'} reason=${chunk.done_reason ?? '-'}`
            )
            send({
              type: 'done',
              messageId,
              done_reason: chunk.done_reason,
              eval_count: chunk.eval_count,
              prompt_eval_count: chunk.prompt_eval_count,
              num_ctx: NUM_CTX,
            })
            break
          }
        }
        if (!finished && !closed) {
          // Upstream ended without a done chunk and nobody cancelled: surface it.
          console.error(
            `[api/chat] upstream ended early model=${model} chunks=${chunks} chars=${full.length}`
          )
          fail(
            full
              ? 'Ollama stopped before finishing the reply.'
              : 'Ollama returned an empty reply.'
          )
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          // Client disconnected / Stop, or request.signal fired. Partial reply
          // is persisted in finally; log so Vercel shows which path it was.
          console.log(
            `[api/chat] aborted model=${model} chunks=${chunks} chars=${full.length} clientClosed=${closed}`
          )
        } else {
          console.error(
            `[api/chat] stream error model=${model} chunks=${chunks} chars=${full.length}`,
            err
          )
          fail('The connection to Ollama dropped mid-response.')
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
