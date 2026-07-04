import { test, expect } from '@playwright/test'
import { spawn } from 'child_process'
import { mkdirSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(__dirname, '../../..')
const TEST_DIR = path.join(__dirname, '../../.e2e-test')
const PANEL_PORT = '18080'

function setupEnv() {
  if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true })
}

test.beforeAll(async () => {
  setupEnv()
})

test('full mvp flow', async ({ page }) => {
  const panel = spawn('go', ['run', './panel/cmd/panel'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      BSDOCK_PORT: PANEL_PORT,
      BSDOCK_DB_PATH: path.join(TEST_DIR, 'panel.db').replace(/\\/g, '/'),
      BSDOCK_JWT_SECRET: 'e2e-secret',
      BSDOCK_ADMIN_USERNAME: 'admin',
      BSDOCK_ADMIN_PASSWORD: 'admin123',
    },
  })
  panel.stdout.on('data', (data) => console.log(`[panel] ${data}`))
  panel.stderr.on('data', (data) => console.error(`[panel] ${data}`))
  panel.on('exit', (code) => console.log(`[panel] exited ${code}`))

  try {
    await new Promise((resolve) => setTimeout(resolve, 4000))

    await page.goto('/login')
    await page.fill('input#username', 'admin')
    await page.fill('input#password', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/nodes')

    await page.click('button:has-text("New Node")')
    await page.fill('input[placeholder="Name" i]', 'e2e-node')
    await page.fill('input[placeholder="Panel URL" i]', `http://localhost:${PANEL_PORT}`)
    await page.click('button[type="submit"]')

    await page.waitForSelector('pre', { timeout: 5000 })
    const command = await page.locator('pre').textContent()
    expect(command).toContain('--token')
    const token = command?.match(/--token\s+(\S+)/)?.[1]
    expect(token).toBeTruthy()

    const wsUrl = `ws://localhost:${PANEL_PORT}/api/v1/agent/ws?token=${token}`
    await page.evaluate((url) => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(url)
        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'register',
              payload: {
                token: url.split('token=')[1],
                hostname: 'e2e-host',
                os: 'linux',
                arch: 'amd64',
                kernel: '6.0',
                cpu_model: 'Test CPU',
                cpu_cores: 2,
                memory_total: 1073741824,
                disk_total: 10737418240,
                disk_free: 5368709120,
                ips: ['127.0.0.1'],
                uptime: 60,
              },
            })
          )
          setTimeout(() => {
            ws.close()
            resolve()
          }, 500)
        }
        ws.onerror = reject
      })
    }, wsUrl)

    await page.waitForTimeout(1000)
    const row = page.locator('table tbody tr').first()
    await expect(row.locator('text=online')).toBeVisible()

    await row.locator('button:has-text("View")').click()
    await page.waitForURL(/\/nodes\/.+/)
    await expect(page.locator('text=e2e-host')).toBeVisible()
  } finally {
    panel.kill()
  }
})
