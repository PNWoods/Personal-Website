import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Memory, UserSettings } from '@/lib/ai/types'
import SettingsApp from '@/components/ai/settings/SettingsApp'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: settings }, { data: memories }] = await Promise.all([
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user?.id ?? '')
      .maybeSingle(),
    supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  return (
    <Suspense fallback={null}>
      <SettingsApp
        userId={user?.id ?? ''}
        userEmail={user?.email ?? ''}
        initialSettings={(settings as UserSettings | null) ?? null}
        initialMemories={(memories as Memory[] | null) ?? []}
      />
    </Suspense>
  )
}
