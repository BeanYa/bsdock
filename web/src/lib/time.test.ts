import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from './time'

describe('formatRelativeTime', () => {
  it('returns em dash for missing values', () => {
    expect(formatRelativeTime(undefined)).toBe('—')
    expect(formatRelativeTime(null)).toBe('—')
    expect(formatRelativeTime('')).toBe('—')
  })

  it('returns em dash for invalid dates', () => {
    expect(formatRelativeTime('not-a-date')).toBe('—')
  })

  it('shows just now for recent timestamps', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('just now')
  })

  it('shows minutes ago', () => {
    const value = new Date(Date.now() - 3 * 60 * 1000).toISOString()
    expect(formatRelativeTime(value)).toBe('3m ago')
  })

  it('shows hours ago', () => {
    const value = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(value)).toBe('2h ago')
  })

  it('shows days ago', () => {
    const value = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(value)).toBe('2d ago')
  })
})
