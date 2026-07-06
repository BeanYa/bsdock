import type { AnchorHTMLAttributes } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NodeCard, type Node } from './node-card'

const defaultMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: defaultMatchMedia,
})

afterEach(() => {
  cleanup()
  window.matchMedia = defaultMatchMedia
})

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
    expect(screen.getAllByText('10.0.0.4').length).toBeGreaterThanOrEqual(1)
  })

  it('shows last seen relative time', () => {
    renderCard(baseNode)
    expect(screen.getByText(/\d+m ago/)).toBeInTheDocument()
  })

  it('displays CPU, MEM, and Disk rings', () => {
    renderCard(baseNode)
    expect(screen.getAllByText('CPU').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('MEM').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Disk').length).toBeGreaterThanOrEqual(1)
  })

  it('uses sm ring size on small viewports', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 639px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    renderCard(baseNode)
    const rings = screen.getAllByRole('img', { name: /^(CPU|MEM|Disk)/ })
    expect(rings).toHaveLength(3)
    rings.forEach((ring) => {
      expect(ring).toHaveClass('w-14')
    })
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

  it('calculates memory percent from used when free is absent', () => {
    renderCard(baseNode)
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('prefers memory_free over memory_used when both are present', () => {
    const node: Node = {
      ...baseNode,
      system_info: { ...baseNode.system_info, memory_free: 8, memory_used: 4 },
    }
    renderCard(node)
    expect(screen.getByText('50%')).toBeInTheDocument()
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
    await userEvent.click(screen.getByText('Rotate Token'))
    expect(onRotateToken).toHaveBeenCalledWith('n1')
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

const metricsNode: Node = {
  id: 'n1',
  name: 'node-1',
  status: 'online',
  platform: 'linux',
  system_info: {
    cpu_percent: 50,
    memory_total: 8000000000,
    memory_used: 4000000000,
    memory_free: 4000000000,
    disk_total: 100000000000,
    disk_free: 50000000000,
    ips: ['10.0.0.1'],
  },
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

describe('NodeCard metrics', () => {
  it('shows CPU, MEM and Disk rings with percentages', () => {
    renderCard(metricsNode)
    expect(screen.getAllByText('50%')).toHaveLength(3)
    expect(screen.getAllByText('CPU').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('MEM').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Disk').length).toBeGreaterThanOrEqual(1)
  })
})
