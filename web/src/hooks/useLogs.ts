import { useEffect, useRef, useState } from 'react'
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
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    setEntries([])
    setError(null)

    const token = getToken()
    if (!token) {
      setError(new Error('未登录'))
      return
    }

    const url = `${getWSBaseURL()}/ws/logs?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

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
        } else {
          setEntries((prev) => {
            const next = [...prev, data]
            return next.length > 200 ? next.slice(next.length - 200) : next
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    return () => {
      ws.close()
    }
  }, [source])

  const switchSource = (newSource: LogSource) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'subscribe', source: newSource }))
    }
  }

  return { entries, connected, error, switchSource }
}
