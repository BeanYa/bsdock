import { useEffect, useState } from 'react'
import { getToken } from '@/lib/auth'

export type LogSource = 'runtime' | 'request'

export interface LogEntry {
  timestamp: string
  level: string
  source: LogSource
  message: string
}

interface SnapshotMessage {
  type: 'snapshot'
  source: LogSource
  entries: LogEntry[]
}

interface EntryMessage extends LogEntry {
  type: 'entry'
}

type WSMessage = SnapshotMessage | EntryMessage

function getWSBaseURL(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}`
}

export function useLogs(source: LogSource) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setEntries([])
    setError(null)

    const token = getToken()
    if (!token) {
      setConnected(false)
      setError(new Error('未登录'))
      return
    }

    const url = `${getWSBaseURL()}/ws/logs?source=${encodeURIComponent(source)}&token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setConnected(true)
      setError(null)
    }

    ws.onclose = () => {
      setConnected(false)
    }

    ws.onerror = () => {
      setError(new Error('WebSocket 连接失败'))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage
        if (data.type === 'snapshot') {
          setEntries(data.entries)
          return
        }

        setEntries((prev) => {
          const next = [...prev, data]
          return next.length > 200 ? next.slice(next.length - 200) : next
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    return () => {
      ws.close()
    }
  }, [source])

  return { entries, connected, error }
}
