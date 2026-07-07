import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLogs, type LogSource } from './useLogs'

class MockWebSocket {
  static OPEN = 1
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.OPEN
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.onclose?.()
  }
}

describe('useLogs', () => {
  beforeEach(() => {
    localStorage.setItem('bsdock_token', 'token')
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('opens the websocket with the selected source', () => {
    const { rerender, unmount } = renderHook(({ source }: { source: LogSource }) => useLogs(source), {
      initialProps: { source: 'runtime' as LogSource },
    })

    expect(MockWebSocket.instances[0].url).toContain('source=runtime')

    rerender({ source: 'request' })

    expect(MockWebSocket.instances[1].url).toContain('source=request')
    unmount()
  })
})
