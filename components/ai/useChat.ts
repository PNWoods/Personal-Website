'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ndjsonLines } from '@/lib/ai/ndjson'
import { autoTitle } from '@/lib/ai/title'
import type {
  ChatMessage,
  ChatStreamEvent,
  ContextUsage,
  Conversation,
  Message,
} from '@/lib/ai/types'

const PENDING_ID = 'pending-assistant'
/** Mirrors the server default; replaced by the real value on the first reply. */
const DEFAULT_NUM_CTX = 32768

interface UseChatOptions {
  userId: string
  model: string | null
  /** Knowledge collections a brand-new conversation should start with. */
  collectionIds: string[]
  onConversationCreated: (conversation: Conversation) => void
  onConversationUpdated: (conversation: Conversation) => void
}

/** Same rough estimate the server uses, for the meter before any reply. */
function estimateUsage(messages: { content: string }[], limit: number): ContextUsage {
  const chars = messages.reduce((n, m) => n + m.content.length, 0)
  return {
    used: Math.ceil(chars / 3.5) + messages.length * 4,
    limit,
    estimated: true,
  }
}

export function useChat({
  userId,
  model,
  collectionIds,
  onConversationCreated,
  onConversationUpdated,
}: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [compacting, setCompacting] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [usage, setUsage] = useState<ContextUsage | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const conversationRef = useRef<string | null>(null)
  const limitRef = useRef(DEFAULT_NUM_CTX)

  const supabase = useMemo(() => createClient(), [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    conversationRef.current = null
    setMessages([])
    setStreaming(false)
    setUsage(null)
  }, [])

  const loadConversation = useCallback(
    async (conversationId: string) => {
      // send() creates the conversation, sets conversationRef, and then pushes
      // ?c=<id> into the URL. The URL change re-runs this for the same id; if we
      // proceeded we would abort the in-flight stream and replace the pending
      // assistant bubble with the DB snapshot (user turn only), so the reply
      // never renders until a refresh. Only load when actually switching.
      if (conversationRef.current === conversationId) return
      abortRef.current?.abort()
      abortRef.current = null
      conversationRef.current = conversationId
      setStreaming(false)
      setLoadingHistory(true)
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      // Ignore if the user switched conversations while loading.
      if (conversationRef.current !== conversationId) return
      const loaded = ((data as Message[] | null) ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? undefined,
      }))
      setMessages(loaded)
      setUsage(loaded.length ? estimateUsage(loaded, limitRef.current) : null)
      setLoadingHistory(false)
    },
    [supabase]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const send = useCallback(
    async (text: string) => {
      if (!model || streaming) return

      let conversationId = conversationRef.current
      if (!conversationId) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: userId,
            title: autoTitle(text),
            model,
            collection_ids: collectionIds,
          })
          .select('*')
          .single()
        if (error || !data) {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              content: '',
              error: `Could not create the conversation: ${error?.message ?? 'unknown error'}`,
            },
          ])
          return
        }
        conversationId = (data as Conversation).id
        conversationRef.current = conversationId
        onConversationCreated(data as Conversation)
      }

      const userMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: text,
      }
      const history = [...messages.filter((m) => !m.error), userMessage]
      setMessages([
        ...history,
        { id: PENDING_ID, role: 'assistant', content: '', streaming: true },
      ])
      setStreaming(true)

      const { data: saved } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, role: 'user', content: text })
        .select('id')
        .single()
      if (saved?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === userMessage.id ? { ...m, id: saved.id } : m))
        )
      }

      const controller = new AbortController()
      abortRef.current = controller

      const patchPending = (patch: Partial<ChatMessage>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === PENDING_ID ? { ...m, ...patch } : m))
        )

      let finalId: string | null = null
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          // The server builds the prompt from the database; `message` only
          // lets it recover if the insert above failed.
          body: JSON.stringify({ conversationId, model, message: text }),
        })

        if (!res.ok || !res.body) {
          let message = `Request failed (${res.status})`
          try {
            const data = (await res.json()) as { error?: string }
            if (data.error) message = data.error
          } catch {
            // non-JSON error body
          }
          patchPending({ streaming: false, error: message })
          return
        }

        let content = ''
        for await (const event of ndjsonLines<ChatStreamEvent>(res.body)) {
          if (event.type === 'delta') {
            content += event.content
            const snapshot = content
            patchPending({ content: snapshot, status: undefined })
          } else if (event.type === 'status') {
            patchPending({ status: event.message })
          } else if (event.type === 'sources') {
            patchPending({ sources: event.sources })
          } else if (event.type === 'compacted') {
            onConversationUpdated({
              id: conversationId,
              summary_message_count: event.summaryMessageCount,
              summary_upto: event.summaryUpto,
            } as Conversation)
          } else if (event.type === 'done') {
            finalId = event.messageId
            limitRef.current = event.num_ctx
            if (event.prompt_eval_count !== undefined) {
              setUsage({
                used: event.prompt_eval_count + (event.eval_count ?? 0),
                limit: event.num_ctx,
              })
            }
          } else if (event.type === 'error') {
            patchPending({ error: event.message })
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          patchPending({
            error: 'Lost the connection while streaming the reply.',
          })
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        // Only finalize if this conversation is still the one on screen.
        if (conversationRef.current === conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === PENDING_ID
                ? {
                    ...m,
                    id: finalId ?? `assistant-${Date.now()}`,
                    streaming: false,
                    status: undefined,
                  }
                : m
            )
          )
          setStreaming(false)
        }
      }
    },
    [
      model,
      streaming,
      messages,
      supabase,
      userId,
      collectionIds,
      onConversationCreated,
      onConversationUpdated,
    ]
  )

  /** Manual compaction of the active conversation. Returns an error string or null. */
  const compact = useCallback(async (): Promise<string | null> => {
    const conversationId = conversationRef.current
    if (!conversationId || !model || streaming || compacting) return null
    setCompacting(true)
    try {
      const res = await fetch('/api/compact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, model }),
      })
      const data = (await res.json()) as {
        conversation?: Conversation
        summarizedCount?: number
        error?: string
      }
      if (!res.ok) return data.error ?? `Compaction failed (${res.status})`
      if (data.conversation) onConversationUpdated(data.conversation)
      // The meter is only exact after the next reply; estimate until then.
      setUsage((prev) =>
        prev ? { ...prev, estimated: true, used: Math.min(prev.used, Math.ceil(prev.limit * 0.3)) } : prev
      )
      return null
    } catch {
      return 'Could not reach the server.'
    } finally {
      setCompacting(false)
    }
  }, [model, streaming, compacting, onConversationUpdated])

  return {
    messages,
    streaming,
    compacting,
    loadingHistory,
    usage,
    send,
    stop,
    compact,
    loadConversation,
    reset,
  }
}
