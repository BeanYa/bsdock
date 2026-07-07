import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Home, ScrollText, Server, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/nodes', label: 'Nodes', icon: Server },
  { to: '/logs', label: 'Logs', icon: ScrollText },
]

function NavLinks({ collapsed, onClick }: { collapsed?: boolean; onClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              'group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-lg px-3 text-sm font-medium transition-all duration-200',
              active
                ? 'bg-[rgba(5,16,28,0.88)] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_36px_rgba(2,12,26,0.28)]'
                : 'text-slate-300 hover:bg-white/[0.05] hover:text-foreground',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? item.label : undefined}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute bottom-2 left-0 top-2 w-px rounded-full bg-transparent transition-colors',
                active && 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.85)]'
              )}
            />
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-transparent bg-white/[0.02] text-slate-400 transition-colors',
                active && 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
                !active && 'group-hover:border-white/10 group-hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarContent({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <Link
          to="/"
          className={cn('flex min-w-0 items-center gap-3', collapsed && 'w-full justify-center')}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            B
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/90">
                BSDock
              </div>
              <div className="truncate text-xs text-muted-foreground">Command Center</div>
            </div>
          )}
        </Link>
      </div>

      <NavLinks collapsed={collapsed} />

      <div className="border-t border-white/10 p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            'h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-foreground',
            collapsed && 'justify-center'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </>
  )
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        data-testid="desktop-sidebar"
        className={cn(
          'command-surface fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/10 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex',
          collapsed ? 'lg:w-20' : 'lg:w-72'
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside
            data-testid="mobile-sidebar"
            className="command-surface fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[calc(100vw-2rem)] flex-col border-r border-white/10 backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Link to="/" className="flex min-w-0 items-center gap-3" onClick={onMobileClose}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-200">
                  B
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/90">
                    BSDock
                  </div>
                  <div className="truncate text-xs text-muted-foreground">Command Center</div>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMobileClose}
                aria-label="Close menu"
                className="h-10 w-10 rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavLinks onClick={onMobileClose} />
          </aside>
        </>
      )}
    </>
  )
}
