import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ResourceCard } from './resource-card'

describe('ResourceCard', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders title and formatted used/total values', () => {
    render(<ResourceCard title="Memory" used={4 * 1024 * 1024 * 1024} total={16 * 1024 * 1024 * 1024} />)
    expect(screen.getByText('Memory')).toBeInTheDocument()
    expect(screen.getByText('4.00 GB / 16.00 GB')).toBeInTheDocument()
  })

  it('shows em dash when both used and total are missing', () => {
    render(<ResourceCard title="Memory" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows used value with unit when total is missing', () => {
    render(<ResourceCard title="CPU" used={45} unit="%" />)
    expect(screen.getByText('45.00 B %')).toBeInTheDocument()
  })

  it('renders green bar for low usage', () => {
    const { container } = render(<ResourceCard title="Memory" used={10} total={100} />)
    const bar = container.querySelector('.rounded-full > div')
    expect(bar).toHaveClass('bg-[#39FF14]')
  })

  it('renders yellow bar for medium usage above 70%', () => {
    const { container } = render(<ResourceCard title="Memory" used={75} total={100} />)
    const bar = container.querySelector('.rounded-full > div')
    expect(bar).toHaveClass('bg-[#FFC107]')
  })

  it('renders red bar for high usage above 90%', () => {
    const { container } = render(<ResourceCard title="Memory" used={95} total={100} />)
    const bar = container.querySelector('.rounded-full > div')
    expect(bar).toHaveClass('bg-[#FF4D4D]')
  })

  it('does not render bar when total is zero', () => {
    const { container } = render(<ResourceCard title="Memory" used={0} total={0} />)
    expect(container.querySelector('.rounded-full')).not.toBeInTheDocument()
  })
})
