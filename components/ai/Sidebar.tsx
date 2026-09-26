'use client'

import { BookOpen, LogOut, MessageSquare, Plus, Settings, Trash2, X } from 'lucide-react'
import type { Conversation, ModelInfo } from '@/lib/ai/types'
import { useAiBase } from './AiBaseProvider'
import ModelSelect, { type OllamaStatus } from './ModelSelect'

export default function Sidebar({
  open,
  onClose,
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
  models,
  model,
  status,
  statusMessage,
  onModelChange,
  onRefreshModels,
  userEmail,
  onSignOut,
}: {
  open: boolean
  onClose: () => void
  conversations: Conversation[]
  activeId: string | null
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  models: ModelInfo[]
  model: string | null
  status: OllamaStatus
  statusMessage: string | null
  onModelChange: (model: string) => void
  onRefreshModels: () => void
  userEmail: string
  onSignOut: () => void
}) {
  const { href } = useAiBase()
  const panel = (
    <div className="flex h-full w-72 flex-col border-r border-white/10 bg-black/90 md:w-64 md:bg-black/40">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium hover:bg-white/10"
        >
          <Plus size={16} />
          New chat
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-white/40">No chats yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const active = c.id === activeId
              return (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg pl-3 pr-9 text-left text-sm ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <MessageSquare size={14} className="shrink-0 opacity-60" />
                    <span className="truncate">{c.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(c.id)
                    }}
                    className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 ${
                      active ? 'md:opacity-100' : ''
                    }`}
                    aria-label="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-white/10 p-3">
        <div className="flex gap-1">
          <a
            href={href('/knowledge')}
            className="flex h-9 flex-1 items-center gap-2 rounded-lg px-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <BookOpen size={15} className="opacity-70" />
            Knowledge bases
          </a>
          <a
            href={href('/settings')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={15} className="opacity-70" />
          </a>
        </div>
        <ModelSelect
          models={models}
          value={model}
          status={status}
          statusMessage={statusMessage}
          onChange={onModelChange}
          onRefresh={onRefreshModels}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-white/40" title={userEmail}>
            {userEmail}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="flex h-8 shrink-0 items-center gap-1 rounded px-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden h-full shrink-0 md:block">{panel}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0">{panel}</aside>
        </div>
      )}
    </>
  )
}
