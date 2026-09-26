import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Collection, Conversation } from '@/lib/ai/types'
import ChatApp from '@/components/ai/ChatApp'

export const dynamic = 'force-dynamic'

export default async function AiPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: conversations }, { data: collections }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200),
    // RLS returns the user's own collections plus shared ones.
    supabase.from('collections').select('*').order('name', { ascending: true }),
  ])

  return (
    <Suspense fallback={null}>
      <ChatApp
        userId={user?.id ?? ''}
        userEmail={user?.email ?? ''}
        initialConversations={(conversations as Conversation[] | null) ?? []}
        initialCollections={(collections as Collection[] | null) ?? []}
      />
    </Suspense>
  )
}
