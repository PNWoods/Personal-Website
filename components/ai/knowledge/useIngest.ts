'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { IngestResponse } from '@/lib/ai/types'

/** Documents processed at the same time (both models share one GPU). */
const CONCURRENCY = 2
const RETRY_DELAYS = [2000, 5000, 10000]

/**
 * Drives /api/knowledge/ingest for documents until they reach a terminal
 * state. Each call does bounded work on the server; this loops, retries
 * network failures, and limits how many documents run at once.
 */
export function useIngest(onProgress: (r: IngestResponse) => void) {
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())
  const queue = useRef<string[]>([])
  const running = useRef(new Set<string>())
  const progressRef = useRef(onProgress)
  progressRef.current = onProgress

  const sync = () =>
    setActiveIds(new Set([...Array.from(running.current), ...queue.current]))

  const step = useCallback(async (documentId: string): Promise<IngestResponse> => {
    let attempt = 0
    for (;;) {
      try {
        const res = await fetch('/api/knowledge/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId }),
        })
        const data = (await res.json()) as IngestResponse & { error?: string }
        if (!res.ok) throw new Error(data.error ?? `Ingest failed (${res.status})`)
        return data
      } catch (err) {
        if (attempt >= RETRY_DELAYS.length) throw err
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt++]))
      }
    }
  }, [])

  const pump = useCallback(() => {
    while (running.current.size < CONCURRENCY && queue.current.length) {
      const id = queue.current.shift() as string
      running.current.add(id)
      sync()
      ;(async () => {
        try {
          for (;;) {
            const r = await step(id)
            progressRef.current(r)
            if (r.done) break
          }
        } catch (err) {
          progressRef.current({
            documentId: id,
            status: 'error',
            chunkCount: 0,
            embeddedCount: 0,
            error: err instanceof Error ? err.message : 'Ingest failed.',
            done: true,
          })
        } finally {
          running.current.delete(id)
          sync()
          pump()
        }
      })()
    }
  }, [step])

  const ingest = useCallback(
    (documentId: string) => {
      if (running.current.has(documentId) || queue.current.includes(documentId)) return
      queue.current.push(documentId)
      sync()
      pump()
    },
    [pump]
  )

  useEffect(() => () => {
    queue.current = []
  }, [])

  return { ingest, activeIds }
}
