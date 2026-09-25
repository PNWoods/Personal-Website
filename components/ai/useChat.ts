'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ndjsonLines } from '@/lib/ai/ndjson'
import { autoTitle } from '@/lib/ai/title'
import type {
  ChatMessage,
  ChatStreamEvent,
  Conversation,
  Message,
} from '@/lib/ai/types'

const PENDING_ID = 'pending-assistant'

interface UseChatOptions {
  userId: string
  model: string | null
  onConversationCreated: (conversation: Conversation) => void
}

export function useChat({ userId, model, onConversationCreated }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const conversationRef = useRef<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    conversationRef.current = null
    setMessages([])
    setStreaming(false)
  }, [])

  const loadConversation = useCallback(
    async (conversationId: string) => {
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
      setMessages(
        ((data as Message[] | null) ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      )
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
          .insert({ user_id: userId, title: autoTitle(text), model })
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
          body: JSON.stringify({
            conversationId,
            model,
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
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
            patchPending({ content: snapshot })
          } else if (event.type === 'done') {
            finalId = event.messageId
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
                ? { ...m, id: finalId ?? `assistant-${Date.now()}`, streaming: false }
                : m
            )
          )
          setStreaming(false)
        }
      }
    },
    [model, streaming, messages, supabase, userId, onConversationCreated]
  )

  return { messages, streaming, loadingHistory, send, stop, loadConversation, reset }
}
