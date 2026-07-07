import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { getToken } from '@/lib/auth'

export function useNode(nodeId: string) {
  const [node, setNode] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)

    try {
      const data = await api.getNode(nodeId)
      setNode(data)
    } catch (err) {
      console.error(err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()

    let ws: WebSocket | null = null
    let interval: ReturnType<typeof setInterval> | null = null
    let disposed = false

    const token = getToken()
    if (!token) return

    const connect = () => {
      const url = new URL('/ws', window.location.origin)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.searchParams.set('token', token)
      url.searchParams.set('node_id', nodeId)

      ws = new WebSocket(url.toString())
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'node_update' && msg.payload?.id === nodeId) {
            setNode(msg.payload)
          }
        } catch (err) {
          console.error(err)
        }
      }
      ws.onclose = () => {
        ws = null
        if (disposed) return
        if (!interval) {
          interval = setInterval(() => load(true), 3000)
        }
      }
      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      disposed = true
      ws?.close()
      if (interval) clearInterval(interval)
    }
  }, [nodeId])

  return { node, loading, reload: load }
}
