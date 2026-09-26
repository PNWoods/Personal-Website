import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Conversation } from '@/lib/ai/types'
import ChatApp from '@/components/ai/ChatApp'

export const dynamic = 'force-dynamic'

export default async function AiPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200)

  return (
    <Suspense fallback={null}>
      <ChatApp
        userId={user?.id ?? ''}
        userEmail={user?.email ?? ''}
        initialConversations={(conversations as Conversation[] | null) ?? []}
      />
    </Suspense>
  )
}
