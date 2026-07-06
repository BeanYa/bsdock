import { useEffect, useState } from 'react'
import { api, type PanelStatus } from '@/lib/api'

export function usePanelStatus(pollMs = 5000) {
  const [status, setStatus] = useState<PanelStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await api.getPanelStatus()
        if (!cancelled) {
          setStatus(data)
          setLastUpdatedAt(Date.now())
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    const id = setInterval(load, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pollMs])

  return { status, loading, error, lastUpdatedAt }
}
