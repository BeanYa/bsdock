import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
    expect(screen.getByRole('img', { name: /MEM/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Disk/ })).toBeInTheDocument()
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

    expect(await screen.findByText(/2\.79 GB \/ 7\.45 GB/)).toBeInTheDocument()
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
    expect(within(ipSection).getByText('fe80::a327:a4d:5263:6758')).toBeInTheDocument()
    expect(within(ipSection).getByText('2001:db8::1')).toBeInTheDocument()
  })
})
