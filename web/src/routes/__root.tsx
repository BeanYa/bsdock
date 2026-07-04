import { useState } from 'react'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { cn } from '@/lib/utils'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300 ease-in-out',
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <AppHeader onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 bg-muted/30 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
