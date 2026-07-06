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
    <nav className="flex-1 space-y-1 p-3">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            active
              ? 'border-l-2 border-[#00F0FF] bg-[rgba(0,240,255,0.08)] text-[#00F0FF] shadow-[inset_0_0_12px_rgba(0,240,255,0.08)]'
              : 'text-[#8B95A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E8EBF0]',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-4 w-4" />
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
      <div className="flex h-14 items-center border-b px-3">
        <Link to="/" className={cn('flex items-center gap-2 font-bold', collapsed && 'justify-center w-full')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            B
          </div>
          {!collapsed && <span>BSDock</span>}
        </Link>
      </div>

      <NavLinks collapsed={collapsed} />

      <div className="border-t p-3">
        <Button variant="ghost" size="icon" onClick={onToggle} className={cn('w-full', collapsed && 'justify-center')}>
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
          'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/[0.08] bg-[rgba(20,28,45,0.75)] backdrop-blur-xl transition-all duration-300 ease-in-out lg:flex',
          collapsed ? 'w-16' : 'w-64'
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
          <aside data-testid="mobile-sidebar" className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/[0.08] bg-[rgba(20,28,45,0.75)] backdrop-blur-xl lg:hidden">
            <div className="flex h-14 items-center justify-between border-b px-3">
              <Link to="/" className="flex items-center gap-2 font-bold" onClick={onMobileClose}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  B
                </div>
                <span>BSDock</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={onMobileClose} aria-label="Close menu">
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
