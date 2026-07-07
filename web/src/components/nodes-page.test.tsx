import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const {
  mockCreateNode,
  mockRotateToken,
  mockResetNode,
  mockToast,
} = vi.hoisted(() => ({
  mockCreateNode: vi.fn(),
  mockRotateToken: vi.fn(),
  mockResetNode: vi.fn(),
  mockToast: vi.fn(),
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
HTMLElement.prototype.hasPointerCapture ??= vi.fn(() => false) as any
HTMLElement.prototype.setPointerCapture ??= vi.fn() as any
HTMLElement.prototype.releasePointerCapture ??= vi.fn() as any
HTMLElement.prototype.scrollIntoView ??= vi.fn() as any

const mockUseNodes = vi.fn(() => ({
  nodes: [] as any[],
  loading: false,
  reload: vi.fn(),
}))

vi.mock('@/hooks/useNodes', () => ({
  useNodes: () => mockUseNodes(),
}))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getDefaultPanelURL: () => 'http://localhost:8080',
    api: {
      ...actual.api,
      createNode: (...args: Parameters<typeof actual.api.createNode>) => mockCreateNode(...args),
      rotateToken: (...args: Parameters<typeof actual.api.rotateToken>) => mockRotateToken(...args),
      resetNode: (...args: Parameters<typeof actual.api.resetNode>) => mockResetNode(...args),
    },
  }
})

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
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
  mockCreateNode.mockReset()
  mockRotateToken.mockReset()
  mockResetNode.mockReset()
  mockToast.mockReset()
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

  it('renders the fleet command surface and empty state copy', async () => {
    mockUseNodes.mockReturnValue({
      nodes: [],
      loading: false,
      reload: vi.fn(),
    })

    renderWithTheme(<RouterProvider router={createNodesRouter()} />)

    expect(await screen.findByPlaceholderText('Search nodes...')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Get started by creating your first node.')).toBeInTheDocument()
  })

  it('filters nodes by search text and status selection', async () => {
    const user = userEvent.setup()
    mockUseNodes.mockReturnValue({
      nodes: [
        {
          id: 'n1',
          name: 'alpha-edge',
          status: 'online',
          platform: 'linux',
          created_at: new Date().toISOString(),
        },
        {
          id: 'n2',
          name: 'beta-db',
          status: 'offline',
          platform: 'linux',
          created_at: new Date().toISOString(),
        },
        {
          id: 'n3',
          name: 'gamma-cache',
          status: 'pending',
          platform: 'windows',
          created_at: new Date().toISOString(),
        },
      ],
      loading: false,
      reload: vi.fn(),
    })

    renderWithTheme(<RouterProvider router={createNodesRouter()} />)

    const searchInput = await screen.findByPlaceholderText('Search nodes...')
    await user.type(searchInput, 'gamma')

    expect(screen.getByText('gamma-cache')).toBeInTheDocument()
    expect(screen.queryByText('alpha-edge')).not.toBeInTheDocument()
    expect(screen.queryByText('beta-db')).not.toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText(/of 3 nodes/)).toBeInTheDocument()

    await user.clear(searchInput)
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Offline' }))

    expect(screen.getByText('beta-db')).toBeInTheDocument()
    expect(screen.queryByText('alpha-edge')).not.toBeInTheDocument()
    expect(screen.queryByText('gamma-cache')).not.toBeInTheDocument()
  })

  it('creates a node and regenerates its install command from the create dialog', async () => {
    const user = userEvent.setup()
    const reload = vi.fn()
    mockUseNodes.mockReturnValue({
      nodes: [],
      loading: false,
      reload,
    })
    mockCreateNode.mockResolvedValue({
      id: 'created-1',
      install_command: 'curl -fsSL https://panel/install.sh | sh',
    })
    mockRotateToken.mockResolvedValue({
      install_command: 'curl -fsSL https://panel/install.sh | sh -s -- --refresh-token',
    })

    renderWithTheme(<RouterProvider router={createNodesRouter()} />)

    await screen.findByText('Nodes')
    await user.click(screen.getByRole('button', { name: /new node/i }))
    await user.type(screen.getByLabelText('Name'), 'edge-01')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(mockCreateNode).toHaveBeenCalledWith(
        'edge-01',
        'http://localhost:8080',
        'linux'
      )
    })
    expect(await screen.findByText(/curl -fsSL https:\/\/panel\/install\.sh \| sh$/)).toBeInTheDocument()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(mockToast).toHaveBeenCalledWith({ title: '节点创建成功' })

    await user.click(screen.getByRole('button', { name: /regenerate/i }))

    await waitFor(() => {
      expect(mockRotateToken).toHaveBeenCalledWith('created-1')
    })
    expect(
      await screen.findByText(/curl -fsSL https:\/\/panel\/install\.sh \| sh -s -- --refresh-token/)
    ).toBeInTheDocument()
  })

  it('opens install command and reset flows from node cards', async () => {
    const user = userEvent.setup()
    mockUseNodes.mockReturnValue({
      nodes: [
        {
          id: 'n9',
          name: 'fleet-prod-09',
          status: 'online',
          platform: 'linux',
          created_at: new Date().toISOString(),
        },
      ],
      loading: false,
      reload: vi.fn(),
    })
    mockRotateToken.mockResolvedValue({
      install_command: 'bash /tmp/install-node.sh',
    })
    mockResetNode.mockResolvedValue({
      install_command: 'bash /tmp/reset-node.sh',
    })

    renderWithTheme(<RouterProvider router={createNodesRouter()} />)

    await user.click(await screen.findByRole('button', { name: /install command/i }))

    await waitFor(() => {
      expect(mockRotateToken).toHaveBeenCalledWith('n9')
    })
    expect(await screen.findByText(/bash \/tmp\/install-node\.sh/)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await user.click(await screen.findByRole('button', { name: /reset/i }))

    await waitFor(() => {
      expect(mockResetNode).toHaveBeenCalledWith('n9')
    })
    expect(await screen.findByText(/bash \/tmp\/reset-node\.sh/)).toBeInTheDocument()
    expect(mockToast).toHaveBeenCalledWith({
      title: '节点已重置，请使用新安装命令重新注册',
    })
  })
})
