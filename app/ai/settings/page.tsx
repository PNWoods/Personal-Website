import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UserSettings } from '@/lib/ai/types'
import SettingsApp from '@/components/ai/settings/SettingsApp'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user?.id ?? '')
    .maybeSingle()

  return (
    <Suspense fallback={null}>
      <SettingsApp
        userId={user?.id ?? ''}
        userEmail={user?.email ?? ''}
        initialSettings={(settings as UserSettings | null) ?? null}
      />
    </Suspense>
  )
}
