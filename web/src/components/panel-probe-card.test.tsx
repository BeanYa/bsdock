import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PanelProbeCard } from './panel-probe-card'
import type { PanelStatus } from '@/lib/api'

function status(overrides: Partial<PanelStatus> = {}): PanelStatus {
  return {
    hostname: 'panel.local',
    version: '0.1.0',
    go_version: 'go1.23',
    platform: 'linux',
    arch: 'amd64',
    uptime_seconds: 10,
    ips: ['10.0.0.1'],
    cpu: { percent: 10, cores: 4, model: 'cpu' },
    memory: { used: 1, total: 2 },
    disk: { used: 1, total: 2 },
    network: { sent: 1, received: 2 },
    nodes: { total: 1, online: 0, offline: 1, pending: 0 },
    ...overrides,
  }
}

describe('PanelProbeCard', () => {
  it('does not show fake host or healthy state when status is missing', () => {
    render(<PanelProbeCard status={null} />)

    expect(screen.getByText('Panel runtime')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '—' })).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.queryByText('localhost')).not.toBeInTheDocument()
    expect(screen.queryByText('Healthy')).not.toBeInTheDocument()
  })

  it('marks the panel degraded when all nodes are offline', () => {
    render(<PanelProbeCard status={status()} />)

    expect(screen.getByText('Degraded')).toBeInTheDocument()
  })
})
