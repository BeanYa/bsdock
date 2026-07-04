import { getToken, clearToken } from '@/lib/auth'

const API_BASE = '/api/v1'

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

export const api = {
  login: (username: string, password: string) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getNodes: () => request('/nodes'),
  getNode: (id: string) => request(`/nodes/${id}`),
  createNode: (name: string, panelURL: string) =>
    request('/nodes', {
      method: 'POST',
      body: JSON.stringify({ name }),
      headers: { 'X-Panel-URL': panelURL },
    }),
}
