import { cn } from '@/lib/utils'
import { getStatusColorClasses, type NodeStatus } from '@/lib/status'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  status?: NodeStatus
  hover?: boolean
  glow?: boolean
}

export function GlassCard({ children, className, status, hover = true, glow = true }: GlassCardProps) {
  const statusClasses = status ? getStatusColorClasses(status) : null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]',
        hover && 'transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(0,240,255,0.35)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_40px_rgba(0,240,255,0.08)]',
        className
      )}
    >
      {status && (
        <div
          data-testid="status-light"
          className={cn('absolute left-0 right-0 top-0 h-[3px]', statusClasses?.bg)}
          aria-hidden="true"
        />
      )}
      {status && <div className="pt-[3px]">{children}</div>}
      {!status && children}
    </div>
  )
}
