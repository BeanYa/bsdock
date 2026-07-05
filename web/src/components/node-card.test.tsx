import type { AnchorHTMLAttributes } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NodeCard, type Node } from './node-card'

afterEach(cleanup)

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({
      children,
      to,
      params,
      ...props
    }: { to?: string; params?: Record<string, string> } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a {...props} data-to={to} data-params={params ? JSON.stringify(params) : undefined}>
        {children}
      </a>
    ),
  }
})

const baseNode: Node = {
  id: 'n1',
  name: 'prod-web-01',
  status: 'online',
  platform: 'linux',
  system_info: {
    ips: ['10.0.0.4'],
    cpu_percent: 12,
    memory_used: 4,
    memory_total: 16,
    disk_total: 100,
    disk_free: 60,
  },
  last_seen_at: new Date(Date.now() - 120_000).toISOString(),
  created_at: new Date().toISOString(),
}

const offlineNode: Node = { ...baseNode, status: 'offline' }

const sparseNode: Node = {
  id: 'n2',
  name: 'sparse',
  status: 'online',
  created_at: new Date().toISOString(),
}

function renderCard(
  node: Node,
  handlers: Partial<{
    onInstallCommand: (id: string) => void
    onReset: (id: string) => void
    onRotateToken: (id: string) => void
  }> = {}
) {
  return render(
    <NodeCard
      node={node}
      onInstallCommand={handlers.onInstallCommand ?? (() => {})}
      onReset={handlers.onReset ?? (() => {})}
      onRotateToken={handlers.onRotateToken ?? (() => {})}
    />
  )
}

describe('NodeCard', () => {
  it('renders name, status, platform and ip', () => {
    renderCard(baseNode)
    expect(screen.getByText('prod-web-01')).toBeInTheDocument()
    expect(screen.getByText('online')).toBeInTheDocument()
    expect(screen.getByText('linux')).toBeInTheDocument()
    expect(screen.getByText('10.0.0.4')).toBeInTheDocument()
  })

  it('shows last seen relative time', () => {
    renderCard(baseNode)
    expect(screen.getByText(/\d+m ago/)).toBeInTheDocument()
  })

  it('displays CPU, MEM, and Disk rings', () => {
    renderCard(baseNode)
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('MEM')).toBeInTheDocument()
    expect(screen.getByText('Disk')).toBeInTheDocument()
  })

  it('exposes install command and reset buttons for online nodes', () => {
    renderCard(baseNode)
    expect(screen.getByRole('button', { name: /install command/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('hides reset button for offline nodes', () => {
    renderCard(offlineNode)
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
  })

  it('falls back to dash for missing resource data', () => {
    renderCard(sparseNode)
    const rings = screen.getAllByRole('img', { name: /unknown/i })
    expect(rings).toHaveLength(3)
    rings.forEach((ring) => {
      expect(ring.parentElement).toHaveTextContent('—')
    })
  })

  it('emits install command action when clicked', async () => {
    const onInstallCommand = vi.fn()
    renderCard(baseNode, { onInstallCommand })
    await userEvent.click(screen.getByRole('button', { name: /install command/i }))
    expect(onInstallCommand).toHaveBeenCalledWith('n1')
  })

  it('emits reset action when clicked', async () => {
    const onReset = vi.fn()
    renderCard(baseNode, { onReset })
    await userEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalledWith('n1')
  })

  it('opens actions menu with rotate token and view details', async () => {
    const onRotateToken = vi.fn()
    renderCard(baseNode, { onRotateToken })
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    expect(screen.getByText('Rotate Token')).toBeInTheDocument()
    expect(screen.getByText('View Details')).toBeInTheDocument()
  })

  it('renders View Details link with correct target and params', () => {
    renderCard(baseNode)
    const link = screen.getByLabelText(/view details for prod-web-01/i)
    expect(link).toHaveAttribute('data-to', '/nodes/$nodeId')
    expect(link).toHaveAttribute('data-params', JSON.stringify({ nodeId: 'n1' }))
  })

  it('handles an invalid last_seen_at date gracefully', () => {
    const invalidDateNode: Node = { ...baseNode, last_seen_at: 'not-a-date' }
    renderCard(invalidDateNode)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })
})
