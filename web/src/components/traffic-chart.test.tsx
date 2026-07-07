import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TrafficCharts } from './traffic-chart'

describe('TrafficCharts', () => {
  beforeEach(() => {
    cleanup()
  })

  it('keeps collecting state with fewer than two samples', () => {
    render(<TrafficCharts sent={0} received={0} updatedAt={0} />)
    expect(screen.getByText('Signal Matrix')).toBeInTheDocument()
    expect(screen.getAllByText('Collecting data...').length).toBe(3)
  })

  it('renders an svg chart once enough samples arrive', () => {
    const { rerender, container } = render(
      <TrafficCharts sent={0} received={0} updatedAt={0} />
    )

    rerender(<TrafficCharts sent={0} received={0} updatedAt={1000} />)
    rerender(<TrafficCharts sent={500} received={250} updatedAt={6000} />)
    rerender(<TrafficCharts sent={1000} received={500} updatedAt={11000} />)

    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('100.00 B/s')).toBeInTheDocument()
    expect(screen.getByText('50.00 B/s')).toBeInTheDocument()
    expect(screen.getByText('150.00 B/s')).toBeInTheDocument()
  })

  it('ignores samples that arrive too close together', () => {
    const { rerender } = render(
      <TrafficCharts sent={0} received={0} updatedAt={0} />
    )

    rerender(<TrafficCharts sent={0} received={0} updatedAt={1000} />)
    rerender(<TrafficCharts sent={100} received={50} updatedAt={1200} />)

    expect(screen.getAllByText('Collecting data...').length).toBe(3)
  })

  it('formats larger speeds with appropriate units', () => {
    const { rerender, container } = render(
      <TrafficCharts sent={0} received={0} updatedAt={0} />
    )

    rerender(<TrafficCharts sent={0} received={0} updatedAt={1000} />)
    rerender(
      <TrafficCharts
        sent={524288}
        received={1048576}
        updatedAt={6000}
      />
    )
    rerender(
      <TrafficCharts
        sent={1048576}
        received={2097152}
        updatedAt={11000}
      />
    )

    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('102.40 KB/s')).toBeInTheDocument()
    expect(screen.getByText('204.80 KB/s')).toBeInTheDocument()
    expect(screen.getByText('307.20 KB/s')).toBeInTheDocument()
  })
})
