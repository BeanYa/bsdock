import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { getToken } from '@/lib/auth'

export function useNode(nodeId: string) {
  const [node, setNode] = useState<any>(null)

  const load = async () => {
    try {
      const data = await api.getNode(nodeId)
      setNode(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    load()

    let ws: WebSocket | null = null
    let interval: ReturnType<typeof setInterval> | null = null

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
        if (!interval) {
          interval = setInterval(load, 3000)
        }
      }
      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      ws?.close()
      if (interval) clearInterval(interval)
    }
  }, [nodeId])

  return { node, reload: load }
}
