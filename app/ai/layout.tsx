import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { aiBasePath } from '@/lib/ai/host'
import { AiBaseProvider } from '@/components/ai/AiBaseProvider'

export const metadata: Metadata = {
  title: 'Chat',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function AiLayout({ children }: { children: React.ReactNode }) {
  const host =
    headers().get('x-forwarded-host') ?? headers().get('host') ?? ''
  const base = aiBasePath(host)

  return (
    <AiBaseProvider base={base}>
      <div className="flex h-full w-full flex-col text-white">{children}</div>
    </AiBaseProvider>
  )
}
