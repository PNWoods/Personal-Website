'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Menu, Minimize2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Collection, Conversation, ModelInfo, UserSettings } from '@/lib/ai/types'
import { ACCENT_STORAGE_KEY, DEFAULT_ACCENT, isAccentColor, type AccentColor } from '@/lib/ai/theme'
import { useAiBase } from './AiBaseProvider'
import Sidebar from './Sidebar'
import MessageList from './MessageList'
import ContextMeter from './ContextMeter'
import KnowledgePicker from './KnowledgePicker'
import Composer from './Composer'
import { useChat } from './useChat'
import type { OllamaStatus } from './ModelSelect'

const MODEL_STORAGE_KEY = 'ai-chat-model'
/** Collections picked before a conversation exists; remembered for the next new chat. */
const COLLECTIONS_STORAGE_KEY = 'ai-chat-collections'
const WEB_STORAGE_KEY = 'ai-chat-web'
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
  initialCollections,
  initialSettings,
}: {
  userId: string
  userEmail: string
  initialConversations: Conversation[]
  initialCollections: Collection[]
  initialSettings: UserSettings | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { href } = useAiBase()

  const [conversations, setConversations] = useState(initialConversations)
  const [collections] = useState(initialCollections)
  // Accent color: DB value wins; localStorage covers the moment before the
  // first server render after a change on another tab.
  const [accent, setAccent] = useState<AccentColor>(
    isAccentColor(initialSettings?.bubble_color) ? initialSettings.bubble_color : DEFAULT_ACCENT
  )
  useEffect(() => {
    if (initialSettings) return
    try {
      const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
      if (isAccentColor(stored)) setAccent(stored)
    } catch {
      // storage unavailable
    }
  }, [initialSettings])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [model, setModel] = useState<string | null>(null)
  const [status, setStatus] = useState<OllamaStatus>('checking')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null)

  const activeId = searchParams.get('c')
  const activeConversation = conversations.find((c) => c.id === activeId)

  // Knowledge selection for a chat that has no row yet lives in local state
  // (and localStorage so the choice sticks for the next new chat).
  const [draftCollectionIds, setDraftCollectionIds] = useState<string[]>([])
  const [draftWeb, setDraftWeb] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLECTIONS_STORAGE_KEY)
      const ids = raw ? (JSON.parse(raw) as string[]) : []
      setDraftCollectionIds(ids.filter((id) => collections.some((c) => c.id === id)))
      setDraftWeb(localStorage.getItem(WEB_STORAGE_KEY) === '1')
    } catch {
      // storage unavailable or corrupt
    }
  }, [collections])

  const webSearch = activeConversation ? Boolean(activeConversation.web_search) : draftWeb

  async function toggleWeb() {
    const next = !webSearch
    setKnowledgeError(null)
    if (!activeConversation) {
      setDraftWeb(next)
      try {
        localStorage.setItem(WEB_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // storage unavailable
      }
      return
    }
    onConversationUpdated({ ...activeConversation, web_search: next })
    const { error } = await createClient()
      .from('conversations')
      .update({ web_search: next })
      .eq('id', activeConversation.id)
    if (error) {
      onConversationUpdated({ ...activeConversation, web_search: !next })
      setKnowledgeError(`Could not update web search: ${error.message}`)
    }
  }

  const visibleIds = (ids: string[]) => ids.filter((id) => collections.some((c) => c.id === id))
  const selectedIds = activeConversation
    ? visibleIds(activeConversation.collection_ids ?? [])
    : draftCollectionIds

  async function toggleCollection(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    setKnowledgeError(null)
    if (!activeConversation) {
      setDraftCollectionIds(next)
      try {
        localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage unavailable
      }
      return
    }
    const previous = activeConversation.collection_ids ?? []
    onConversationUpdated({ ...activeConversation, collection_ids: next })
    const { error } = await createClient()
      .from('conversations')
      .update({ collection_ids: next })
      .eq('id', activeConversation.id)
    if (error) {
      onConversationUpdated({ ...activeConversation, collection_ids: previous })
      setKnowledgeError(`Could not update knowledge selection: ${error.message}`)
    }
  }

  const onConversationCreated = useCallback(
    (conversation: Conversation) => {
      setConversations((prev) => [conversation, ...prev])
      // history.replaceState keeps useSearchParams in sync (Next 14.1+) without
      // a server round-trip; router.replace re-fetches the page and could
      // re-render the tree while the first reply is still streaming.
      window.history.replaceState(null, '', `${pathname}?c=${conversation.id}`)
    },
    [pathname]
  )

  const onConversationUpdated = useCallback((patch: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === patch.id ? { ...c, ...patch } : c))
    )
  }, [])

  const chat = useChat({
    userId,
    model,
    collectionIds: selectedIds,
    webSearch,
    onConversationCreated,
    onConversationUpdated,
  })
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
            <KnowledgePicker
              userId={userId}
              collections={collections}
              selectedIds={selectedIds}
              webSearch={webSearch}
              onToggle={toggleCollection}
              onToggleWeb={toggleWeb}
              disabled={chat.streaming}
            />
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
        {(compactError || knowledgeError) && (
          <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs text-red-300">
            {compactError ?? knowledgeError}
          </p>
        )}

        {chat.loadingHistory && chat.messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-white/40">
            Loading…
          </div>
        ) : (
          <MessageList messages={chat.messages} model={model} accent={accent} />
        )}

        <Composer
          disabled={!model}
          streaming={chat.streaming}
          onSend={chat.send}
          onStop={chat.stop}
          accent={accent}
        />
      </div>
    </div>
  )
}
