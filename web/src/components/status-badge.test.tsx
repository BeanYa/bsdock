import { render, screen, cleanup } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import { StatusBadge } from './status-badge'

afterEach(() => {
  cleanup()
})

describe('StatusBadge', () => {
  it('renders status text', () => {
    render(<StatusBadge status="online" />)
    expect(screen.getByText('online')).toBeInTheDocument()
  })

  it('renders dot variant with status dot', () => {
    render(<StatusBadge status="online" variant="dot" />)
    expect(screen.getByText('online')).toBeInTheDocument()
  })

  it('uses destructive styling for pending status', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('pending')).toHaveClass('text-[#FF4D4D]')
  })

  it('applies command center border and background tokens', () => {
    render(<StatusBadge status="offline" />)
    expect(screen.getByText('offline')).toHaveClass('bg-[rgba(8,10,15,0.45)]')
    expect(screen.getByText('offline')).toHaveClass('border-white/[0.08]')
  })

  it('maps dot variant status tokens to shell and dot colors', () => {
    render(<StatusBadge status="offline" variant="dot" />)

    const badge = screen.getByText('offline')
    const dot = badge.querySelector('span')

    expect(badge).toHaveClass('text-[#FFC107]')
    expect(badge).toHaveClass('bg-[rgba(8,10,15,0.45)]')
    expect(badge).toHaveClass('border-white/[0.08]')
    expect(dot).toHaveClass('bg-[#FFC107]')
  })
})
