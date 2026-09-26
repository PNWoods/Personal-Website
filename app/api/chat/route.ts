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
import {
  RAG_TOKEN_BUDGET,
  assembleRetrieval,
  retrieveKnowledge,
  type Excerpt,
  type Retrieval,
} from '@/lib/ai/knowledge/retrieve'
import { searchWeb, webSearchConfigured } from '@/lib/ai/knowledge/web'
import {
  addMemories,
  extractMemories,
  formatMemoryBlock,
  loadMemories,
  parseRememberCommand,
} from '@/lib/ai/memory'
import type { ChatRequestBody, ChatStreamEvent, Memory, Message } from '@/lib/ai/types'
import { waitUntil } from '@vercel/functions'

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

  // Per-user memory: what we already know, whether to keep learning, and an
  // explicit "remember that ..." in this turn.
  let memories: Memory[] = []
  let memoryAuto = true
  let justRemembered: string | null = null
  try {
    const [mem, settings] = await Promise.all([
      loadMemories(supabase, user.id),
      supabase.from('user_settings').select('memory_auto').eq('user_id', user.id).maybeSingle(),
    ])
    memories = mem
    memoryAuto = (settings.data as { memory_auto?: boolean } | null)?.memory_auto !== false
    const latest = history[history.length - 1]
    const fact = latest?.role === 'user' ? parseRememberCommand(latest.content) : null
    if (fact) {
      const added = await addMemories(supabase, user.id, [fact], {
        kind: 'manual',
        conversationId,
        existing: memories,
      })
      memories = [...memories, ...added]
      justRemembered = fact
    }
  } catch (err) {
    // Memory is a nicety; never block the reply on it (e.g. migration not run yet).
    console.error('[api/chat] memory load failed', err)
  }
  let memoryBlock = formatMemoryBlock(memories)
  if (justRemembered) {
    memoryBlock += `\n\nThe user just asked you to remember: "${justRemembered}". It has been saved. Acknowledge that in one short sentence, then continue.`
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
        // 1. Retrieve excerpts for the latest user turn: knowledge-base chunks
        //    when collections are selected, live web results when the web
        //    toggle is on. Both run together; either failing just drops out.
        const lastUser = history[history.length - 1]
        const useKb = Boolean(conversation!.collection_ids?.length)
        const useWeb = Boolean(conversation!.web_search)
        if ((useKb || useWeb) && lastUser?.role === 'user') {
          const query = lastUser.content
          send({
            type: 'status',
            message: useWeb && useKb ? 'Searching knowledge and the web…' : useWeb ? 'Searching the web…' : 'Searching knowledge…',
          })
          if (useWeb && !webSearchConfigured()) {
            send({ type: 'status', message: 'Web search is not configured (BRAVE_SEARCH_API_KEY); continuing…' })
          }
          const webBudget = useKb ? Math.floor(RAG_TOKEN_BUDGET / 2) : RAG_TOKEN_BUDGET
          const kbBudget = useWeb ? RAG_TOKEN_BUDGET - webBudget : RAG_TOKEN_BUDGET

          const [kb, web] = await Promise.all([
            useKb
              ? retrieveKnowledge(supabase, {
                  query,
                  collectionIds: conversation!.collection_ids,
                  tokenBudget: kbBudget,
                  signal: upstreamAbort.signal,
                }).catch((err: unknown) => {
                  if ((err as Error)?.name === 'AbortError') throw err
                  console.error('[api/chat] knowledge retrieval failed', err)
                  return [] as Excerpt[]
                })
              : Promise.resolve([] as Excerpt[]),
            useWeb && webSearchConfigured()
              ? searchWeb(query, { tokenBudget: webBudget, signal: upstreamAbort.signal }).catch(
                  (err: unknown) => {
                    if ((err as Error)?.name === 'AbortError') throw err
                    console.error('[api/chat] web search failed', err)
                    return { excerpts: [] as Excerpt[], note: 'Web search failed.' }
                  }
                )
              : Promise.resolve({ excerpts: [] as Excerpt[] } as { excerpts: Excerpt[]; note?: string }),
          ])

          knowledge = assembleRetrieval([...kb, ...web.excerpts])
          console.log(
            `[api/chat] retrieved conversation=${conversationId} kb=${kb.length} web=${web.excerpts.length}${web.note ? ` (${web.note})` : ''}`
          )
          send({ type: 'sources', sources: knowledge.sources })
        }

        // 2. Fit the prompt into the window, compacting older turns if needed.
        let prompt = buildPrompt(conversation!, history, {
          knowledge: knowledge?.block,
          memories: memoryBlock,
        })
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
            prompt = buildPrompt(conversation, history, {
              knowledge: knowledge?.block,
              memories: memoryBlock,
            })
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
            // Learn durable facts from this exchange after the response is
            // out the door. waitUntil keeps the function alive for it.
            const latest = history[history.length - 1]
            if (
              memoryAuto &&
              !justRemembered &&
              latest?.role === 'user' &&
              latest.content.trim().split(/\s+/).length >= 4 &&
              full.length > 0
            ) {
              waitUntil(
                extractMemories(supabase, {
                  userId: user.id,
                  conversationId,
                  model,
                  userText: latest.content,
                  assistantText: full,
                  existing: memories,
                })
                  .then((added) => {
                    if (added.length) {
                      console.log(
                        `[api/chat] remembered ${added.length}: ${added.map((m) => m.content).join(' | ')}`
                      )
                    }
                  })
                  .catch((err) => console.error('[api/chat] memory extraction failed', err))
              )
            }
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
