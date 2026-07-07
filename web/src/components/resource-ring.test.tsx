import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResourceRing } from './resource-ring'

describe('ResourceRing', () => {
  it('renders label and percent', () => {
    render(<ResourceRing label="CPU" percent={42} />)
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('shows dash when percent is null', () => {
    render(<ResourceRing label="Disk" percent={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('uses sm size class when size is sm', () => {
    const { container } = render(<ResourceRing label="CPU" percent={10} size="sm" />)
    expect(container.querySelector('svg')).toHaveClass('w-14')
  })

  it('uses lg size class when size is lg', () => {
    const { container } = render(<ResourceRing label="CPU" percent={10} size="lg" />)
    expect(container.querySelector('svg')).toHaveClass('w-36')
  })

  it('renders subtitle when provided', () => {
    render(<ResourceRing label="CPU" percent={42} subtitle="4 Cores" />)
    expect(screen.getByText('4 Cores')).toBeInTheDocument()
  })

  it('uses destructive red at 90 percent and above', () => {
    const { container } = render(<ResourceRing label="CPU" percent={91} />)
    expect(container.querySelector('circle[stroke="#FF4D4D"]')).toBeInTheDocument()
  })

  it('uses amber between 70 and 89 percent', () => {
    const { container } = render(<ResourceRing label="MEM" percent={75} />)
    expect(container.querySelector('circle[stroke="#FFC107"]')).toBeInTheDocument()
  })

  it('keeps motion limited to transform and opacity-safe properties', () => {
    const { container } = render(<ResourceRing label="CPU" percent={42} />)
    expect(container.querySelector('circle[stroke-dashoffset]')).not.toHaveClass('transition-[stroke-dashoffset]')
  })
})
