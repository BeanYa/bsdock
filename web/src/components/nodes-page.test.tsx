import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  createRootRoute,
  createRouter,
  RouterProvider,
  createMemoryHistory,
  Outlet,
} from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { Route as NodesIndexRoute } from '@/routes/nodes/index'

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

const mockUseNodes = vi.fn(() => ({
  nodes: [] as any[],
  loading: false,
  reload: vi.fn(),
}))

vi.mock('@/hooks/useNodes', () => ({
  useNodes: () => mockUseNodes(),
}))

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

function createNodesRouter() {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  })

  const nodesRoute = NodesIndexRoute.update({
    // @ts-expect-error UpdatableRouteOptions does not include id/path/getParentRoute for file routes, but routeTree.gen.ts sets them at runtime.
    id: '/nodes/',
    path: '/nodes/',
    getParentRoute: () => rootRoute,
  })

  return createRouter({
    routeTree: rootRoute.addChildren([nodesRoute]),
    history: createMemoryHistory({ initialEntries: ['/nodes/'] }),
  })
}

afterEach(() => {
  cleanup()
  mockUseNodes.mockClear()
})

describe('NodesPage theme', () => {
  it('renders without errors and applies forced dark mode', async () => {
    renderWithTheme(<RouterProvider router={createNodesRouter()} />)

    expect(await screen.findByText('Nodes')).toBeInTheDocument()
    expect(screen.getByText('New Node')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })
})

describe('NodesPage metrics', () => {
  it('renders node cards with runtime metrics', async () => {
    mockUseNodes.mockReturnValue({
      nodes: [
        {
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
        },
      ],
      loading: false,
      reload: vi.fn(),
    })

    renderWithTheme(<RouterProvider router={createNodesRouter()} />)

    expect(await screen.findByText('node-1')).toBeInTheDocument()
    expect(screen.getAllByText('50%')).toHaveLength(3)
    expect(screen.getAllByText('CPU').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('MEM').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Disk').length).toBeGreaterThanOrEqual(1)
  })
})
