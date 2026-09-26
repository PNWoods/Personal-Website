'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Menu, Minimize2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Conversation, ModelInfo } from '@/lib/ai/types'
import { useAiBase } from './AiBaseProvider'
import Sidebar from './Sidebar'
import MessageList from './MessageList'
import ContextMeter from './ContextMeter'
import Composer from './Composer'
import { useChat } from './useChat'
import type { OllamaStatus } from './ModelSelect'

const MODEL_STORAGE_KEY = 'ai-chat-model'
// First match wins when nothing is stored. Benchmarked on the RTX 4080 Laptop
// host (12 GB VRAM + 64 GB RAM): qwen3.6 MoE ~72 tok/s, the others ~44 tok/s.
const PREFERRED_MODELS = [
  'qwen3.6:35b-a3b-coding',
  'qwen3-coder:30b',
  'qwen2.5-coder:14b',
]

export default function ChatApp({
  userId,
  userEmail,
  initialConversations,
}: {
  userId: string
  userEmail: string
  initialConversations: Conversation[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { href } = useAiBase()

  const [conversations, setConversations] = useState(initialConversations)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [model, setModel] = useState<string | null>(null)
  const [status, setStatus] = useState<OllamaStatus>('checking')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const activeId = searchParams.get('c')

  const onConversationCreated = useCallback(
    (conversation: Conversation) => {
      setConversations((prev) => [conversation, ...prev])
      router.replace(`${pathname}?c=${conversation.id}`, { scroll: false })
    },
    [router, pathname]
  )

  const onConversationUpdated = useCallback((patch: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === patch.id ? { ...c, ...patch } : c))
    )
  }, [])

  const chat = useChat({ userId, model, onConversationCreated, onConversationUpdated })
  const { loadConversation, reset } = chat
  const [compactError, setCompactError] = useState<string | null>(null)

  async function handleCompact() {
    setCompactError(null)
    const err = await chat.compact()
    if (err) setCompactError(err)
  }

  // Load the selected conversation whenever ?c= changes.
  useEffect(() => {
    if (activeId) {
      loadConversation(activeId)
    } else {
      reset()
    }
  }, [activeId, loadConversation, reset])

  const fetchModels = useCallback(async () => {
    setStatus('checking')
    setStatusMessage(null)
    try {
      const res = await fetch('/api/models', { cache: 'no-store' })
      const data = (await res.json()) as { models?: ModelInfo[]; error?: string }
      if (!res.ok) {
        setStatus('offline')
        setStatusMessage(data.error ?? `Failed to list models (${res.status})`)
        setModels([])
        return
      }
      const list = data.models ?? []
      setModels(list)
      setStatus('online')
      setModel((current) => {
        if (current && list.some((m) => m.name === current)) return current
        let stored: string | null = null
        try {
          stored = localStorage.getItem(MODEL_STORAGE_KEY)
        } catch {
          stored = null
        }
        if (stored && list.some((m) => m.name === stored)) return stored
        const preferred = PREFERRED_MODELS.find((name) =>
          list.some((m) => m.name === name)
        )
        return preferred ?? list[0]?.name ?? null
      })
    } catch {
      setStatus('offline')
      setStatusMessage('Could not reach the server.')
      setModels([])
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  function handleModelChange(name: string) {
    setModel(name)
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, name)
    } catch {
      // storage unavailable
    }
  }

  function handleNew() {
    setSidebarOpen(false)
    router.replace(pathname, { scroll: false })
  }

  function handleSelect(id: string) {
    setSidebarOpen(false)
    router.replace(`${pathname}?c=${id}`, { scroll: false })
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this chat?')) return
    setConversations((prev) => prev.filter((c) => c.id !== id))
    await createClient().from('conversations').delete().eq('id', id)
    if (id === activeId) router.replace(pathname, { scroll: false })
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push(href('/login'))
    router.refresh()
  }

  const activeConversation = conversations.find((c) => c.id === activeId)

  return (
    <div className="flex h-full w-full">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onNew={handleNew}
        onSelect={handleSelect}
        onDelete={handleDelete}
        models={models}
        model={model}
        status={status}
        statusMessage={statusMessage}
        onModelChange={handleModelChange}
        onRefreshModels={fetchModels}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-2 md:px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
          <span className="truncate text-sm font-medium text-white/80">
            {activeConversation?.title ?? 'New chat'}
          </span>
          {(activeConversation?.summary_message_count ?? 0) > 0 && (
            <span
              className="hidden shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white/50 sm:block"
              title="Older messages were summarized so the conversation fits the model's context window. They are still shown here."
            >
              {activeConversation!.summary_message_count} compacted
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {chat.usage && <ContextMeter usage={chat.usage} />}
            {activeConversation && chat.messages.length > 6 && (
              <button
                type="button"
                onClick={handleCompact}
                disabled={chat.streaming || chat.compacting}
                className="flex h-8 items-center gap-1 rounded px-2 text-xs text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"
                title="Summarize older messages to free up context"
              >
                <Minimize2 size={14} />
                {chat.compacting ? 'Compacting…' : 'Compact'}
              </button>
            )}
            {model && (
              <span className="hidden truncate text-xs text-white/40 lg:block">
                {model}
              </span>
            )}
          </div>
        </header>
        {compactError && (
          <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs text-red-300">
            {compactError}
          </p>
        )}

        {chat.loadingHistory && chat.messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-white/40">
            Loading…
          </div>
        ) : (
          <MessageList messages={chat.messages} model={model} />
        )}

        <Composer
          disabled={!model}
          streaming={chat.streaming}
          onSend={chat.send}
          onStop={chat.stop}
        />
      </div>
    </div>
  )
}
