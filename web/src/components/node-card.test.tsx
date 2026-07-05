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
  system_info: { ips: ['10.0.0.4'], cpu_percent: 12, memory_used: 4, memory_total: 16 },
  last_seen_at: new Date(Date.now() - 120_000).toISOString(),
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
  it('renders name, status, platform, ip and resource snapshot', () => {
    renderCard(baseNode)
    expect(screen.getByText('prod-web-01')).toBeInTheDocument()
    expect(screen.getByText('online')).toBeInTheDocument()
    expect(screen.getByText('linux')).toBeInTheDocument()
    expect(screen.getByText('10.0.0.4')).toBeInTheDocument()
    expect(screen.getByText(/CPU 12%.*MEM 25%/)).toBeInTheDocument()
  })

  it('shows last seen relative time', () => {
    renderCard(baseNode)
    expect(screen.getByText(/\d+m ago/)).toBeInTheDocument()
  })

  it('emits reset action for online node', async () => {
    const onReset = vi.fn()
    renderCard(baseNode, { onReset })
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    await userEvent.click(screen.getByText('Reset'))
    expect(onReset).toHaveBeenCalledWith('n1')
  })

  it('emits install command action for offline node', async () => {
    const onInstallCommand = vi.fn()
    const offlineNode: Node = { ...baseNode, status: 'offline' }
    renderCard(offlineNode, { onInstallCommand })
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    await userEvent.click(screen.getByText('Install Command'))
    expect(onInstallCommand).toHaveBeenCalledWith('n1')
  })

  it('renders pending status', () => {
    const pendingNode: Node = { ...baseNode, status: 'pending' }
    renderCard(pendingNode)
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('emits rotate token action', async () => {
    const onRotateToken = vi.fn()
    renderCard(baseNode, { onRotateToken })
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    await userEvent.click(screen.getByText('Rotate Token'))
    expect(onRotateToken).toHaveBeenCalledWith('n1')
  })

  it('renders View Details link with correct target and params', async () => {
    renderCard(baseNode)
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    const link = screen.getByRole('menuitem', { name: 'View Details' })
    expect(link).toHaveAttribute('data-to', '/nodes/$nodeId')
    expect(link).toHaveAttribute('data-params', JSON.stringify({ nodeId: 'n1' }))
  })

  it('shows placeholders for missing platform, ips, last seen and hides snapshot', () => {
    const sparseNode: Node = {
      id: 'n2',
      name: 'sparse',
      status: 'online',
      created_at: new Date().toISOString(),
    }
    renderCard(sparseNode)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByText(/CPU|MEM/)).not.toBeInTheDocument()
  })

  it('handles an invalid last_seen_at date gracefully', () => {
    const invalidDateNode: Node = { ...baseNode, last_seen_at: 'not-a-date' }
    renderCard(invalidDateNode)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('handles memory_total of zero without showing Infinity', () => {
    const zeroTotalNode: Node = {
      ...baseNode,
      system_info: { ...baseNode.system_info, memory_total: 0 },
    }
    renderCard(zeroTotalNode)
    expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument()
    expect(screen.queryByText(/MEM/)).not.toBeInTheDocument()
    expect(screen.getByText(/CPU 12%/)).toBeInTheDocument()
  })
})
