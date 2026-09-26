import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Collection, KnowledgeDocument, UserSettings } from '@/lib/ai/types'
import { DEFAULT_ACCENT, isAccentColor } from '@/lib/ai/theme'
import KnowledgeApp from '@/components/ai/knowledge/KnowledgeApp'

export const dynamic = 'force-dynamic'

export default async function KnowledgePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: collections }, { data: documents }, { data: settings }] = await Promise.all([
    supabase.from('collections').select('*').order('name', { ascending: true }),
    supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user?.id ?? '')
      .maybeSingle(),
  ])
  const color = (settings as UserSettings | null)?.bubble_color

  return (
    <Suspense fallback={null}>
      <KnowledgeApp
        userId={user?.id ?? ''}
        initialCollections={(collections as Collection[] | null) ?? []}
        initialDocuments={(documents as KnowledgeDocument[] | null) ?? []}
        accent={isAccentColor(color) ? color : DEFAULT_ACCENT}
      />
    </Suspense>
  )
}
