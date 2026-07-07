import { getToken, clearToken } from '@/lib/auth'

const API_BASE = '/api/v1'

export function getDefaultPanelURL(): string {
  // During local development the Vite dev server may bind to any port (5173 by
  // default, or 5174/5175/etc. if 5173 is already in use). The panel backend is
  // always expected on localhost:8080 in that setup, so redirect any localhost
  // origin that is not the backend port.
  try {
    const url = new URL(window.location.origin)
    if (
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      url.port !== '8080'
    ) {
      return 'http://localhost:8080'
    }
  } catch {
    // Fall through to returning the raw origin if parsing fails.
  }
  return window.location.origin
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    throw new Error(await res.text())
  }
  return res.json()
}

export interface PanelStatus {
  hostname: string
  version: string
  go_version: string
  platform: string
  arch: string
  uptime_seconds: number
  ips: string[]
  cpu: {
    percent: number
    cores: number
    model: string
  }
  memory: {
    used: number
    total: number
  }
  disk: {
    used: number
    total: number
  }
  network: {
    sent: number
    received: number
  }
  nodes: {
    total: number
    online: number
    offline: number
    pending: number
  }
}

export const api = {
  login: (username: string, password: string) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getNodes: () => request('/nodes'),
  getNode: (id: string) => request(`/nodes/${id}`),
  createNode: (name: string, panelURL: string, platform: string) =>
    request('/nodes', {
      method: 'POST',
      body: JSON.stringify({ name, platform }),
      headers: { 'X-Panel-URL': panelURL },
    }),
  rotateToken: (id: string) =>
    request(`/nodes/${id}/rotate-token`, {
      method: 'POST',
      headers: { 'X-Panel-URL': getDefaultPanelURL() },
    }),
  resetNode: (id: string) =>
    request(`/nodes/${id}/reset`, {
      method: 'POST',
      headers: { 'X-Panel-URL': getDefaultPanelURL() },
    }),
  logPageView: async (path: string, title: string, referrer: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const token = getToken()
    if (!token) return
    headers.Authorization = `Bearer ${token}`

    await fetch(`${API_BASE}/events/page-view`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ path, title, referrer }),
    })
  },
  getPanelStatus: () => request('/panel/status') as Promise<PanelStatus>,
}
