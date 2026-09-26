import 'server-only'

import type { createClient } from '@/lib/supabase/server'
import { NUM_CTX } from './context'
import { OllamaError, ollamaFetch } from './ollama'
import type { Memory } from './types'

type Db = ReturnType<typeof createClient>

/** Most memories kept per user; oldest automatic ones are pruned past this. */
export const MAX_MEMORIES = 60
/** Most new facts a single reply may add. */
const MAX_NEW_PER_TURN = 3

export async function loadMemories(db: Db, userId: string): Promise<Memory[]> {
  const { data } = await db
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(MAX_MEMORIES)
  return (data as Memory[] | null) ?? []
}

/** System-prompt section listing what is known about the user. */
export function formatMemoryBlock(memories: Memory[]): string {
  if (memories.length === 0) return ''
  const lines = memories.map((m) => `- ${m.content}`).join('\n')
  return `## About the user (remembered across conversations)
Use these facts to tailor answers. Do not recite them back unless relevant, and do not mention that you have a memory unless asked. If the user says something that contradicts a fact, prefer what they say now.

${lines}`
}

const REMEMBER_RE = /^\s*(?:please\s+)?remember(?:\s+that)?\s*[:,]?\s*([\s\S]+)$/i

/** "remember that I use PowerShell" → "I use PowerShell" (null when not a remember command). */
export function parseRememberCommand(text: string): string | null {
  const m = REMEMBER_RE.exec(text.trim())
  if (!m) return null
  const fact = m[1].trim().replace(/[.!]+$/, '')
  return fact.length >= 3 && fact.length <= 500 ? fact : null
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Insert facts that are not already known; returns the rows added. */
export async function addMemories(
  db: Db,
  userId: string,
  facts: string[],
  opts: { kind: 'auto' | 'manual'; conversationId?: string | null; existing?: Memory[] }
): Promise<Memory[]> {
  const existing = opts.existing ?? (await loadMemories(db, userId))
  const known = new Set(existing.map((m) => normalize(m.content)))
  const fresh: string[] = []
  for (const raw of facts) {
    const fact = raw.trim().replace(/\s+/g, ' ').slice(0, 500)
    const key = normalize(fact)
    if (!key || known.has(key)) continue
    known.add(key)
    fresh.push(fact)
  }
  if (fresh.length === 0) return []

  const { data, error } = await db
    .from('memories')
    .insert(
      fresh.map((content) => ({
        user_id: userId,
        content,
        kind: opts.kind,
        source_conversation_id: opts.conversationId ?? null,
      }))
    )
    .select('*')
  if (error) throw new Error(`Failed to save memories: ${error.message}`)

  // Keep the list bounded: drop the oldest automatic memories past the cap.
  const total = existing.length + fresh.length
  if (total > MAX_MEMORIES) {
    const overflow = total - MAX_MEMORIES
    const victims = existing.filter((m) => m.kind === 'auto').slice(0, overflow)
    if (victims.length) {
      await db
        .from('memories')
        .delete()
        .in(
          'id',
          victims.map((m) => m.id)
        )
    }
  }
  return (data as Memory[] | null) ?? []
}

const EXTRACT_SYSTEM = `You maintain a short memory about a user for a coding assistant. From the latest exchange, extract only durable facts about the USER that would help future conversations: their role, projects, tools and environment, preferences (style, language, frameworks), and standing constraints. Do not record the assistant's answer, transient details, questions, or anything already in the known list. Output a JSON array of strings (0 to ${MAX_NEW_PER_TURN} items, each under 140 characters, written in third person like "Uses PowerShell on Windows 11"). Output [] when there is nothing worth keeping. Output JSON only.`

/**
 * Ask the model whether the latest exchange contains anything worth
 * remembering, and save it. Designed to run in the background after a reply.
 */
export async function extractMemories(
  db: Db,
  args: {
    userId: string
    conversationId: string
    model: string
    userText: string
    assistantText: string
    existing: Memory[]
  }
): Promise<Memory[]> {
  const known = args.existing.map((m) => `- ${m.content}`).join('\n') || '(none)'
  const user = `Known facts:\n${known}\n\n=====\n\nUSER:\n${args.userText.slice(0, 4000)}\n\nASSISTANT:\n${args.assistantText.slice(0, 2000)}`

  const res = await ollamaFetch('/api/chat', {
    method: 'POST',
    json: {
      model: args.model,
      stream: false,
      think: false,
      keep_alive: '30m',
      format: 'json',
      // Same num_ctx as the chat: Ollama reloads the model (~20 s) whenever a
      // request asks for a different context size, even a smaller one.
      options: { num_ctx: NUM_CTX, temperature: 0, num_predict: 300 },
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM },
        { role: 'user', content: user },
      ],
    },
  })
  const data = (await res.json()) as { message?: { content?: string }; error?: string }
  if (data.error) throw new OllamaError(data.error)
  const facts = parseFacts(data.message?.content ?? '')
  if (facts.length === 0) return []
  return addMemories(db, args.userId, facts.slice(0, MAX_NEW_PER_TURN), {
    kind: 'auto',
    conversationId: args.conversationId,
    existing: args.existing,
  })
}

/** Accept a bare array, or an object wrapping one (some models do that with format=json). */
function parseFacts(raw: string): string[] {
  const text = raw.trim()
  const candidates: unknown[] = []
  try {
    candidates.push(JSON.parse(text))
  } catch {
    const m = /\[[\s\S]*\]/.exec(text)
    if (m) {
      try {
        candidates.push(JSON.parse(m[0]))
      } catch {
        // give up below
      }
    }
  }
  for (const c of candidates) {
    const arr = Array.isArray(c)
      ? c
      : c && typeof c === 'object'
        ? Object.values(c as Record<string, unknown>).find(Array.isArray)
        : null
    if (Array.isArray(arr)) {
      return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 2)
    }
  }
  return []
}
