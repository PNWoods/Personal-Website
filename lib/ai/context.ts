import 'server-only'

import type { createClient } from '@/lib/supabase/server'
import { OllamaError, ollamaFetch } from './ollama'
import type { Conversation, Message, Role } from './types'

/**
 * Context-window management for the chat proxy.
 *
 * The server owns the prompt: it loads the conversation and its messages from
 * Supabase, injects the compacted summary (if any) into the system prompt, and
 * summarizes older turns when the prompt would not fit the model's window.
 */

type Db = ReturnType<typeof createClient>

function envInt(name: string, fallback: number, min: number, max: number) {
  const raw = Number(process.env[name])
  if (!Number.isFinite(raw)) return fallback
  return Math.min(max, Math.max(min, Math.floor(raw)))
}

/** Context window requested from Ollama. qwen3.6 supports up to 256K. */
export const NUM_CTX = envInt('OLLAMA_NUM_CTX', 32768, 4096, 262144)
/** Compact once the prompt exceeds this fraction of the window. */
export const COMPACT_AT = 0.7
/** Messages kept verbatim after compaction (3 user/assistant turns). */
export const KEEP_RECENT = 6
/** Tokens reserved for the model's reply. */
const REPLY_RESERVE = 2048
/** Longest summary the model may produce. */
const SUMMARY_MAX_TOKENS = 1500
/** Max messages loaded per request; anything older must be compacted first. */
const HISTORY_LIMIT = 400

export const SYSTEM_PROMPT = `You are a private coding assistant for a senior software engineer. Be precise and concrete: prefer working code and exact commands over prose, keep identifiers, file paths, versions, and numbers exactly as given, and say clearly when you are unsure rather than guessing.`

const COMPACT_SYSTEM = `You compact chat transcripts so a conversation can continue with limited context. Write a dense, factual summary in Markdown with these sections, omitting any that are empty:

## Goal
## Decisions and key facts
## Code, files and commands (keep exact names, paths, snippets that matter)
## Open questions and next steps

Preserve exact identifiers, error messages, numbers and URLs. Do not add commentary, do not answer the user, do not mention that this is a summary.`

export interface PromptMessage {
  role: Role
  content: string
}

/** Rough tokenizer-free estimate; ~3.5 chars/token is conservative for code. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

/** Includes ~4 tokens of chat-template overhead per message. */
export function estimatePromptTokens(messages: PromptMessage[]): number {
  return messages.reduce((n, m) => n + estimateTokens(m.content) + 4, 0)
}

export async function loadConversation(
  db: Db,
  conversationId: string
): Promise<Conversation | null> {
  const { data } = await db
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle()
  return (data as Conversation | null) ?? null
}

/** Messages the model should still see: everything after the compacted point. */
export async function loadHistory(
  db: Db,
  conversation: Conversation
): Promise<Message[]> {
  let query = db
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit(HISTORY_LIMIT)
  if (conversation.summary_upto) {
    query = query.gt('created_at', conversation.summary_upto)
  }
  const { data } = await query
  return (data as Message[] | null) ?? []
}

export function buildPrompt(
  conversation: Conversation,
  history: Message[]
): PromptMessage[] {
  const system = conversation.summary
    ? `${SYSTEM_PROMPT}\n\n## Earlier in this conversation (compacted)\n${conversation.summary}`
    : SYSTEM_PROMPT
  return [
    { role: 'system', content: system },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ]
}

export function needsCompaction(
  prompt: PromptMessage[],
  historyLength: number
): boolean {
  return (
    historyLength > KEEP_RECENT &&
    estimatePromptTokens(prompt) > NUM_CTX * COMPACT_AT - REPLY_RESERVE
  )
}

/**
 * Last-resort guard: drop the oldest verbatim messages until the prompt fits.
 * Only reached if compaction failed or a single message is enormous.
 */
export function trimToFit(prompt: PromptMessage[]): PromptMessage[] {
  const out = [...prompt]
  while (out.length > 2 && estimatePromptTokens(out) > NUM_CTX - REPLY_RESERVE) {
    out.splice(1, 1)
  }
  return out
}

async function summarize(
  model: string,
  priorSummary: string | null,
  batch: Message[],
  signal?: AbortSignal
): Promise<string> {
  const transcript = batch
    .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
    .join('\n\n---\n\n')
  const user = priorSummary
    ? `Existing summary of even earlier messages (fold it in, do not drop anything from it):\n\n${priorSummary}\n\n=====\n\nTranscript to add:\n\n${transcript}`
    : `Transcript:\n\n${transcript}`

  const res = await ollamaFetch('/api/chat', {
    method: 'POST',
    signal,
    json: {
      model,
      stream: false,
      think: false,
      keep_alive: '30m',
      options: {
        num_ctx: NUM_CTX,
        temperature: 0.2,
        num_predict: SUMMARY_MAX_TOKENS,
      },
      messages: [
        { role: 'system', content: COMPACT_SYSTEM },
        { role: 'user', content: user },
      ],
    },
  })
  const data = (await res.json()) as {
    message?: { content?: string }
    error?: string
  }
  if (data.error) throw new OllamaError(data.error)
  const summary = data.message?.content?.trim()
  if (!summary) throw new OllamaError('Compaction produced an empty summary.')
  return summary
}

/**
 * Split messages into batches whose transcript fits comfortably in the window
 * alongside the running summary, so arbitrarily long histories compact.
 */
function batches(messages: Message[]): Message[][] {
  const budget = Math.floor(NUM_CTX * 0.55)
  const out: Message[][] = []
  let current: Message[] = []
  let size = 0
  for (const m of messages) {
    const t = estimateTokens(m.content) + 8
    if (current.length > 0 && size + t > budget) {
      out.push(current)
      current = []
      size = 0
    }
    current.push(m)
    size += t
  }
  if (current.length > 0) out.push(current)
  return out
}

export interface CompactResult {
  conversation: Conversation
  history: Message[]
  summarizedCount: number
}

/**
 * Summarize everything except the most recent `keepRecent` messages into the
 * conversation's summary and persist it. Returns the updated conversation and
 * the messages that remain verbatim.
 */
export async function compactConversation(
  db: Db,
  conversation: Conversation,
  history: Message[],
  model: string,
  opts: { keepRecent?: number; signal?: AbortSignal } = {}
): Promise<CompactResult> {
  const keep = opts.keepRecent ?? KEEP_RECENT
  if (history.length <= keep) {
    return { conversation, history, summarizedCount: 0 }
  }
  const older = history.slice(0, history.length - keep)
  const recent = history.slice(history.length - keep)

  let summary = conversation.summary
  for (const batch of batches(older)) {
    summary = await summarize(model, summary, batch, opts.signal)
  }

  const upto = older[older.length - 1].created_at
  const count = conversation.summary_message_count + older.length
  const { data, error } = await db
    .from('conversations')
    .update({
      summary,
      summary_upto: upto,
      summary_message_count: count,
    })
    .eq('id', conversation.id)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(`Failed to save summary: ${error?.message ?? 'unknown'}`)
  }
  return {
    conversation: data as Conversation,
    history: recent,
    summarizedCount: older.length,
  }
}
