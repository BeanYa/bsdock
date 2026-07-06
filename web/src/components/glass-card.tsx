import { cn } from '@/lib/utils'
import { getStatusColorClasses, type NodeStatus } from '@/lib/status'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: NodeStatus
  hover?: boolean
}

export function GlassCard({ children, className, status, hover = true, ...props }: GlassCardProps) {
  const statusClasses = status ? getStatusColorClasses(status) : null

  return (
    <div
      className={cn(
        'glass relative overflow-hidden rounded-xl',
        hover && 'glass-hover cursor-default',
        className
      )}
      {...props}
    >
      {status && (
        <div
          data-testid="status-light"
          className={cn('absolute left-0 right-0 top-0 h-[3px]', statusClasses?.bg)}
          aria-label={`status: ${status}`}
        />
      )}
      {status && <div className="pt-[3px]">{children}</div>}
      {!status && children}
    </div>
  )
}
