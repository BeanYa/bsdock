import { useNavigate } from '@tanstack/react-router'
import { LogOut, Menu, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { clearToken, isAuthenticated } from '@/lib/auth'

interface AppHeaderProps {
  onMobileMenuOpen: () => void
}

export function AppHeader({ onMobileMenuOpen }: AppHeaderProps) {
  const navigate = useNavigate()
  const authenticated = isAuthenticated()

  const handleLogout = () => {
    clearToken()
    navigate({ to: '/login' })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1520px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg border border-white/10 bg-white/[0.03] lg:hidden"
          onClick={onMobileMenuOpen}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
          {authenticated && (
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-200/80">
                Command Center
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="status-pulse inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                <span className="truncate">Session active</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {authenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="User menu"
                  className="h-10 w-10 rounded-lg border-white/10 bg-white/[0.03]"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
