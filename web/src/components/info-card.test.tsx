import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { InfoCard } from './info-card'

describe('InfoCard', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders title and value', () => {
    render(<InfoCard title="Hostname" value="web-01" />)
    expect(screen.getByText('Hostname')).toBeInTheDocument()
    expect(screen.getByText('web-01')).toBeInTheDocument()
  })

  it('shows em dash when value is missing', () => {
    render(<InfoCard title="Hostname" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows the string zero instead of an em dash', () => {
    render(<InfoCard title="Count" value="0" />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
