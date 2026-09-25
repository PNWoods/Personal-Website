import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OllamaError, ollamaFetch } from '@/lib/ai/ollama'
import type { ModelInfo } from '@/lib/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface OllamaTag {
  name: string
  size: number
  details?: { parameter_size?: string }
}

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await ollamaFetch('/api/tags')
    const data = (await res.json()) as { models?: OllamaTag[] }
    const models: ModelInfo[] = (data.models ?? [])
      .map((m) => ({
        name: m.name,
        size: m.size,
        parameterSize: m.details?.parameter_size,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json({ models })
  } catch (err) {
    if (err instanceof OllamaError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to list models' }, { status: 502 })
  }
}
