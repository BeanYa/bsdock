import { test, expect } from '@playwright/test'

const mockNodes = [
  {
    id: 'node-1',
    name: 'web-server-01',
    status: 'online',
    system_info: {
      hostname: 'web-server-01',
      os: 'linux',
      arch: 'amd64',
      kernel: '6.1.0',
      cpu_model: 'AMD EPYC',
      cpu_cores: 4,
      memory_total: 8589934592,
      disk_total: 107374182400,
      disk_free: 53687091200,
      ips: ['10.0.0.1'],
      uptime: 3600,
    },
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'node-2',
    name: 'db-server-01',
    status: 'offline',
    system_info: {},
    last_seen_at: null,
    created_at: new Date().toISOString(),
  },
]

async function mockApi(page: any) {
  await page.route('/api/v1/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.endsWith('/api/v1/login') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-jwt-token' }),
      })
    }

    if (url.endsWith('/api/v1/nodes') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNodes),
      })
    }

    if (url.endsWith('/api/v1/nodes') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ install_command: 'curl -sSL http://example.com/install.sh | bash --token mock-token' }),
      })
    }

    const nodeDetailMatch = url.match(/\/api\/v1\/nodes\/([^/]+)$/)
    if (nodeDetailMatch && method === 'GET') {
      const node = mockNodes.find((n) => n.id === nodeDetailMatch[1]) || mockNodes[0]
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(node),
      })
    }

    return route.continue()
  })
}

async function login(page: any) {
  await page.goto('/login')
  await page.fill('input#username', 'admin')
  await page.fill('input#password', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/nodes')
}

test.describe('responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page)
  })

  test('login landing page renders correctly on desktop and mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: '轻量 Panel-Node 管理平台' })).toBeVisible()
    await expect(page.getByText('实时监控', { exact: true })).toBeVisible()
    await expect(page.getByText('一键安装', { exact: true })).toBeVisible()
    await expect(page.getByText('集中管理', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: '登录到 BSDock' })).toBeVisible()

    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'BSDock' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: '登录到 BSDock' })).toBeVisible()
  })

  test('sidebar is visible on desktop and collapsible via menu on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)

    await expect(page.getByTestId('desktop-sidebar')).toBeVisible()
    await expect(page.getByTestId('desktop-sidebar').getByText('Nodes')).toBeVisible()
    await expect(page.locator('[aria-label="Open menu"]')).toBeHidden()

    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/nodes')
    await page.waitForURL('/nodes')

    await expect(page.getByTestId('mobile-sidebar')).toBeHidden()
    await page.click('[aria-label="Open menu"]')
    await expect(page.getByTestId('mobile-sidebar').getByText('Nodes')).toBeVisible()
    await page.click('[aria-label="Close menu"]')
    await expect(page.getByTestId('mobile-sidebar')).toBeHidden()
  })

  test('nodes page has no invalid placeholder buttons and layout is reasonable', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)

    await expect(page.locator('button:has-text("New Node")')).toBeVisible()
    await expect(page.locator('input[placeholder="Search nodes..."]')).toBeVisible()
    await expect(page.getByTestId('node-card').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'web-server-01' })).toBeVisible()

    const emptyButtons = page.locator('button:empty:not([aria-label])')
    const count = await emptyButtons.count()
    expect(count).toBe(0)
  })

  test('node detail cards adapt to screen size', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)

    await page.getByTestId('node-card').first().getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('menuitem', { name: 'View Details' }).click()
    await page.waitForURL(/\/nodes\/.+/)

    await expect(page.getByRole('heading', { name: 'web-server-01' })).toBeVisible()
    await expect(page.getByText('Hostname', { exact: true })).toBeVisible()

    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForURL(/\/nodes\/.+/)

    await expect(page.getByRole('heading', { name: 'web-server-01' })).toBeVisible()
  })
})
