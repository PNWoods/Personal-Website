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
  /** Knowledge collections consulted for this conversation (migration 0005). */
  collection_ids: string[]
  /** Also run a web search for every message (migration 0007). */
  web_search: boolean
}

export interface Message {
  id: string
  conversation_id: string
  role: Role
  content: string
  created_at: string
  /** Sources cited by an assistant turn; [] when retrieval ran and found nothing. */
  sources?: Source[] | null
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
  sources?: Source[]
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

// ---------------------------------------------------------------------------
// Knowledge bases (migration 0005)
// ---------------------------------------------------------------------------

/** 'web' sources come from an on-demand search and are not stored as documents. */
export type SourceType = 'file' | 'url' | 'note' | 'web'
export type DocumentStatus =
  | 'uploading'
  | 'pending'
  | 'extracting'
  | 'embedding'
  | 'ready'
  | 'error'

export interface Collection {
  id: string
  user_id: string
  name: string
  description: string | null
  is_shared: boolean
  created_at: string
  updated_at: string
}

/** Named KnowledgeDocument to avoid clashing with the DOM `Document` type. */
export interface KnowledgeDocument {
  id: string
  collection_id: string
  user_id: string
  title: string
  source_type: SourceType
  source_url: string | null
  storage_path: string | null
  mime_type: string | null
  size_bytes: number | null
  content: string | null
  status: DocumentStatus
  error: string | null
  chunk_count: number
  embedded_count: number
  embedding_model: string | null
  created_at: string
  updated_at: string
}

/** One numbered excerpt shown to the model and cited as [n] in its reply. */
export interface Source {
  n: number
  chunkId: string
  documentId: string
  title: string
  section: string | null
  snippet: string
  sourceType: SourceType
  url: string | null
}

export interface IngestResponse {
  documentId: string
  status: DocumentStatus
  chunkCount: number
  embeddedCount: number
  error?: string
  /** True when the document reached a terminal state (ready or error). */
  done: boolean
}

export type ChatStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'sources'; sources: Source[] }
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
