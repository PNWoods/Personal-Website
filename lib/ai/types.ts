export type Role = 'user' | 'assistant' | 'system'

export interface Conversation {
  id: string
  user_id: string
  title: string
  model: string
  created_at: string
  updated_at: string
  /** Compacted summary of messages up to `summary_upto` (see migration 0004). */
  summary: string | null
  summary_upto: string | null
  summary_message_count: number
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
  /** Progress text shown while streaming and no content has arrived yet. */
  status?: string
  error?: string
}

export interface ChatRequestBody {
  conversationId: string
  model: string
  /**
   * The user turn that was just sent. The server builds the prompt from the
   * database; this is only used to recover if the client's insert failed.
   */
  message?: string
}

export interface ContextUsage {
  /** Tokens the model actually processed on the last turn (prompt + reply). */
  used: number
  /** Context window the server requested from Ollama (num_ctx). */
  limit: number
  /** True when `used` is a character-based estimate rather than a real count. */
  estimated?: boolean
}

export type ChatStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'delta'; content: string }
  | {
      type: 'compacted'
      summarizedCount: number
      summaryMessageCount: number
      summaryUpto: string
    }
  | {
      type: 'done'
      messageId: string | null
      done_reason?: string
      eval_count?: number
      prompt_eval_count?: number
      num_ctx: number
    }
  | { type: 'error'; message: string }

export interface ModelInfo {
  name: string
  size: number
  parameterSize?: string
}
