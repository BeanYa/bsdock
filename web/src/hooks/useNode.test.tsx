import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNode } from './useNode'

const mocks = vi.hoisted(() => ({
  getNode: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    getNode: mocks.getNode,
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

describe('useNode', () => {
  beforeEach(() => {
    localStorage.setItem('bsdock_token', 'token')
    mocks.getNode.mockResolvedValue({ id: 'n1' })
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
    const { unmount } = renderHook(() => useNode('n1'))

    expect(MockWebSocket.instances).toHaveLength(1)

    unmount()

    expect(setIntervalSpy).not.toHaveBeenCalled()
  })
})
