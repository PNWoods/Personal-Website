export type Role = 'user' | 'assistant' | 'system'

export interface Conversation {
  id: string
  user_id: string
  title: string
  model: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: Role
  content: string
  created_at: string
}

/** Client-side message shape (adds transient streaming state). */
export interface ChatMessage {
  id: string
  role: Role
  content: string
  streaming?: boolean
  error?: string
}

export interface ChatRequestBody {
  conversationId: string
  model: string
  messages: { role: Role; content: string }[]
}

export type ChatStreamEvent =
  | { type: 'delta'; content: string }
  | {
      type: 'done'
      messageId: string | null
      done_reason?: string
      eval_count?: number
    }
  | { type: 'error'; message: string }

export interface ModelInfo {
  name: string
  size: number
  parameterSize?: string
}
