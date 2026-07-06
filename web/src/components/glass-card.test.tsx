import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GlassCard } from './glass-card'

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>content</GlassCard>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('shows status light bar for online status', () => {
    const { container } = render(<GlassCard status="online">content</GlassCard>)
    const bar = container.querySelector('[data-testid="status-light"]')
    expect(bar).toHaveClass('bg-[#39FF14]')
  })

  it('labels the status light bar for screen readers', () => {
    render(<GlassCard status="offline">content</GlassCard>)
    expect(screen.getByLabelText('status: offline')).toBeInTheDocument()
  })
})
