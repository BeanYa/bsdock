export function isAuthenticated(): boolean {
  return !!localStorage.getItem('bsdock_token')
}

export function setToken(token: string) {
  localStorage.setItem('bsdock_token', token)
}

export function getToken(): string | null {
  return localStorage.getItem('bsdock_token')
}

export function clearToken() {
  localStorage.removeItem('bsdock_token')
}
