import '@testing-library/jest-dom/vitest'

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    store: new Map<string, string>(),
    getItem(key: string) {
      return this.store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      this.store.set(key, value)
    },
    removeItem(key: string) {
      this.store.delete(key)
    },
    clear() {
      this.store.clear()
    },
  },
  writable: true,
})
