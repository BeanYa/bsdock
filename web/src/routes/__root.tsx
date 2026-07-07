import { useEffect, useRef, useState } from 'react'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { cn } from '@/lib/utils'
import { isAuthenticated } from '@/lib/auth'
import { api } from '@/lib/api'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const lastPathRef = useRef(typeof document !== 'undefined' ? document.referrer : '')
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    const referrer = lastPathRef.current
    lastPathRef.current = pathname
    if (isLoginPage || !isAuthenticated()) {
      return
    }

    const title = typeof document !== 'undefined' ? document.title : ''
    void api.logPageView(pathname, title, referrer).catch(() => undefined)
  }, [isLoginPage, pathname])

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-background" aria-hidden="true" />
      <div className="fixed inset-0 -z-10 command-grid opacity-60" aria-hidden="true" />
      <div className="fixed inset-0 -z-10 ambient-light" aria-hidden="true" />
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          'flex min-h-screen flex-col',
          collapsed ? 'lg:pl-20' : 'lg:pl-72'
        )}
      >
        <AppHeader onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
          <div className="mx-auto w-full max-w-[1520px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
