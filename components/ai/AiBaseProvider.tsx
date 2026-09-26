'use client'

import { createContext, useContext, useMemo } from 'react'

interface AiBase {
  /** '' on ai.pnwoods.com, '/ai' on the main domain. */
  base: string
  /** Build a public href for a chat-app path such as '/' or '/login'. */
  href: (path: string) => string
}

const AiBaseContext = createContext<AiBase>({
  base: '/ai',
  href: (path) => (path === '/' ? '/ai' : `/ai${path}`),
})

export function AiBaseProvider({
  base,
  children,
}: {
  base: string
  children: React.ReactNode
}) {
  const value = useMemo<AiBase>(
    () => ({
      base,
      href: (path: string) => {
        if (path === '/') return base || '/'
        return `${base}${path}`
      },
    }),
    [base]
  )
  return <AiBaseContext.Provider value={value}>{children}</AiBaseContext.Provider>
}

export function useAiBase() {
  return useContext(AiBaseContext)
}
