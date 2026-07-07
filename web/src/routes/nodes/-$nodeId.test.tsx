import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  createRootRoute,
  createRouter,
  RouterProvider,
  createMemoryHistory,
  Outlet,
} from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { Route as NodeDetailRoute } from '@/routes/nodes/$nodeId'

const mockNode = {
  id: 'n1',
  name: 'test-node',
  status: 'online',
  platform: 'linux',
  system_info: {
    cpu_percent: 45.5,
    memory_total: 8000000000,
    memory_used: 3000000000,
    memory_free: 4000000000,
    disk_total: 100000000000,
    disk_free: 60000000000,
    cpu_cores: 4,
    ips: ['192.168.1.10', '10.0.0.5', 'fe80::a327:a4d:5263:6758', '2001:db8::1'],
  },
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

vi.mock('@/hooks/useNode', () => ({
  useNode: () => ({
    node: mockNode,
    loading: false,
    reload: vi.fn(),
  }),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

window.scrollTo = vi.fn() as any

function renderWithTheme(ui: ReactNode) {
  return render(
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme="dark"
    >
      {ui}
    </ThemeProvider>
  )
}

describe('NodeDetailPage resources', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders vitals, hardware, and install sections with compact metrics', async () => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    })

    const nodeRoute = NodeDetailRoute.update({
      // @ts-expect-error UpdatableRouteOptions does not include id/path/getParentRoute for file routes, but routeTree.gen.ts sets them at runtime.
      id: '/nodes/$nodeId',
      path: '/nodes/$nodeId',
      getParentRoute: () => rootRoute,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([nodeRoute]),
      history: createMemoryHistory({ initialEntries: ['/nodes/n1'] }),
    })

    renderWithTheme(<RouterProvider router={router} />)

    expect((await screen.findAllByRole('heading', { name: 'test-node' })).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /back to nodes/i })).toBeInTheDocument()
    expect(screen.getByText('Server Probe')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByText('Packets')).toBeInTheDocument()
    expect(screen.getByText('Disk I/O')).toBeInTheDocument()
    expect(screen.getByText('Total Data')).toBeInTheDocument()
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('Install Command')).toBeInTheDocument()
  })

  it('renders resource rings for CPU, MEM and Disk', async () => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    })

    const nodeRoute = NodeDetailRoute.update({
      // @ts-expect-error UpdatableRouteOptions does not include id/path/getParentRoute for file routes, but routeTree.gen.ts sets them at runtime.
      id: '/nodes/$nodeId',
      path: '/nodes/$nodeId',
      getParentRoute: () => rootRoute,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([nodeRoute]),
      history: createMemoryHistory({ initialEntries: ['/nodes/n1'] }),
    })

    renderWithTheme(<RouterProvider router={router} />)

    expect(await screen.findByRole('img', { name: /CPU/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^MEM/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Disk/ })).toBeInTheDocument()
  })

  it('shows memory used / total instead of total / total', async () => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    })

    const nodeRoute = NodeDetailRoute.update({
      // @ts-expect-error UpdatableRouteOptions does not include id/path/getParentRoute for file routes, but routeTree.gen.ts sets them at runtime.
      id: '/nodes/$nodeId',
      path: '/nodes/$nodeId',
      getParentRoute: () => rootRoute,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([nodeRoute]),
      history: createMemoryHistory({ initialEntries: ['/nodes/n1'] }),
    })

    renderWithTheme(<RouterProvider router={router} />)

    expect((await screen.findAllByText(/2\.79 GB \/ 7\.45 GB/)).length).toBeGreaterThan(0)
  })

  it('displays IPv4 and IPv6 addresses separately', async () => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    })

    const nodeRoute = NodeDetailRoute.update({
      // @ts-expect-error UpdatableRouteOptions does not include id/path/getParentRoute for file routes, but routeTree.gen.ts sets them at runtime.
      id: '/nodes/$nodeId',
      path: '/nodes/$nodeId',
      getParentRoute: () => rootRoute,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([nodeRoute]),
      history: createMemoryHistory({ initialEntries: ['/nodes/n1'] }),
    })

    renderWithTheme(<RouterProvider router={router} />)

    const ipSections = await screen.findAllByTestId('ip-section')
    expect(ipSections.length).toBeGreaterThan(0)
    const ipSection = ipSections[0]
    expect(within(ipSection).getByText('IPv4')).toBeInTheDocument()
    expect(within(ipSection).getByText('IPv6')).toBeInTheDocument()
    expect(within(ipSection).getByText('192.168.1.10')).toBeInTheDocument()
    expect(within(ipSection).getByText('10.0.0.5')).toBeInTheDocument()
    expect(within(ipSection).getByText('fe80::a327:a4d:5263:6758')).toHaveClass(
      'break-all',
      'font-mono',
      'text-xs',
      'font-semibold',
      'text-foreground'
    )
    expect(within(ipSection).getByText('2001:db8::1')).toHaveClass(
      'break-all',
      'font-mono',
      'text-xs',
      'font-semibold',
      'text-foreground'
    )
  })
})
