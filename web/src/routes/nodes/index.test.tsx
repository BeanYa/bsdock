import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  createRootRoute,
  createRouter,
  RouterProvider,
  createMemoryHistory,
  Outlet,
} from '@tanstack/react-router'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ThemeProvider } from '@/components/theme-provider'
import { Route as NodesIndexRoute } from './index'

const cssSource = readFileSync(
  pathToFileURL(resolve(process.cwd(), 'src/index.css')),
  'utf-8'
)

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

vi.mock('@/hooks/useNodes', () => ({
  useNodes: () => ({
    nodes: [],
    loading: false,
    reload: vi.fn(),
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

describe('NodesPage theme', () => {
  it('renders without errors and applies forced dark mode theme tokens', async () => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    })

    const nodesRoute = NodesIndexRoute.update({
      id: '/nodes/',
      path: '/nodes/',
      getParentRoute: () => rootRoute,
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([nodesRoute]),
      history: createMemoryHistory({ initialEntries: ['/nodes/'] }),
    })

    renderWithTheme(<RouterProvider router={router} />)

    expect(await screen.findByText('Nodes')).toBeInTheDocument()
    expect(screen.getByText('New Node')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    expect(cssSource).toContain('--background: 220 18% 6%')
    expect(cssSource).toContain('--primary: 186 100% 50%')
    expect(cssSource).toContain('.dark')
    expect(cssSource).toContain('--card: 214 17% 16%')
  })
})
