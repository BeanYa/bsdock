import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNodes } from './useNodes'

const mocks = vi.hoisted(() => ({
  getNodes: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    getNodes: mocks.getNodes,
  },
}))

class MockWebSocket {
  static instances: MockWebSocket[] = []

  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  close() {
    this.onclose?.()
  }
}

describe('useNodes', () => {
  beforeEach(() => {
    localStorage.setItem('bsdock_token', 'token')
    mocks.getNodes.mockResolvedValue([])
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('does not start fallback polling when the hook unmounts', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const { unmount } = renderHook(() => useNodes())

    expect(MockWebSocket.instances).toHaveLength(1)

    unmount()

    expect(setIntervalSpy).not.toHaveBeenCalled()
  })
})
