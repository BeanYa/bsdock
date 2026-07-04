import { test, expect } from '@playwright/test'

test('real backend login flow', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input#username', 'admin')
  await page.fill('input#password', 'admin123')
  await page.click('button[type="submit"]')

  await page.waitForURL('/nodes', { timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'Nodes' })).toBeVisible()
  await expect(page.locator('button:has-text("New Node")')).toBeVisible()
})
