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
    Link: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
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

describe('NodeCard', () => {
  it('renders name, status, platform, ip and resource snapshot', () => {
    render(<NodeCard node={baseNode} onInstallCommand={() => {}} onReset={() => {}} onRotateToken={() => {}} />)
    expect(screen.getByText('prod-web-01')).toBeInTheDocument()
    expect(screen.getByText('ONLINE')).toBeInTheDocument()
    expect(screen.getByText('LINUX')).toBeInTheDocument()
    expect(screen.getByText('10.0.0.4')).toBeInTheDocument()
    expect(screen.getByText(/CPU 12%.*MEM 25%/)).toBeInTheDocument()
  })

  it('shows last seen relative time', () => {
    render(<NodeCard node={baseNode} onInstallCommand={() => {}} onReset={() => {}} onRotateToken={() => {}} />)
    expect(screen.getByText(/\d+m ago/)).toBeInTheDocument()
  })

  it('emits reset action for online node', async () => {
    const onReset = vi.fn()
    render(<NodeCard node={baseNode} onReset={onReset} onInstallCommand={() => {}} onRotateToken={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    await userEvent.click(screen.getByText('Reset'))
    expect(onReset).toHaveBeenCalledWith('n1')
  })

  it('emits install command action for offline node', async () => {
    const onInstallCommand = vi.fn()
    const offlineNode: Node = { ...baseNode, status: 'offline' }
    render(<NodeCard node={offlineNode} onInstallCommand={onInstallCommand} onReset={() => {}} onRotateToken={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    await userEvent.click(screen.getByText('Install Command'))
    expect(onInstallCommand).toHaveBeenCalledWith('n1')
  })
})
