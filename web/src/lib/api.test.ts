import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, getDefaultPanelURL } from './api'

describe('api', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    globalThis.localStorage.setItem('bsdock_token', 'test-token')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    globalThis.localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('getDefaultPanelURL', () => {
    it('returns localhost backend during vite dev on default port', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:5173' },
        writable: true,
      })
      expect(getDefaultPanelURL()).toBe('http://localhost:8080')
    })

    it('returns localhost backend when vite uses an alternate port', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:5175' },
        writable: true,
      })
      expect(getDefaultPanelURL()).toBe('http://localhost:8080')
    })

    it('returns localhost backend for 127.0.0.1 dev origins', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://127.0.0.1:5173' },
        writable: true,
      })
      expect(getDefaultPanelURL()).toBe('http://localhost:8080')
    })

    it('returns window.location.origin when already on the backend port', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:8080' },
        writable: true,
      })
      expect(getDefaultPanelURL()).toBe('http://localhost:8080')
    })

    it('returns window.location.origin in production', () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://panel.example.com' },
        writable: true,
      })
      expect(getDefaultPanelURL()).toBe('https://panel.example.com')
    })
  })

  describe('rotateToken', () => {
    it('posts to rotate-token with auth and panel url headers', async () => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://panel.example.com' },
        writable: true,
      })

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ install_command: 'curl --token abc123' }),
      } as Response)
      globalThis.fetch = fetchMock

      const result = await api.rotateToken('node-1')

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/nodes/node-1/rotate-token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'X-Panel-URL': 'https://panel.example.com',
          }),
        })
      )
      expect(result.install_command).toBe('curl --token abc123')
    })
  })
})
