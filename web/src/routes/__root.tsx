import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import { Sun, Moon, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isAuthenticated, clearToken } from '@/lib/auth'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const authenticated = isAuthenticated()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleLogout = () => {
    clearToken()
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">BSDock</Link>
        <div className="flex items-center gap-2">
          <Button
            className="h-9 w-9 border bg-transparent p-0 hover:bg-accent"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {authenticated && (
            <Button
              className="h-9 w-9 border bg-transparent p-0 hover:bg-accent"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
