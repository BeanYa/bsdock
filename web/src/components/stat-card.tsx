import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getStatusColorClasses } from '@/lib/status'

interface StatCardProps {
  title: string
  value?: number | string
  description?: string
  icon?: React.ReactNode
  className?: string
  status?: 'online' | 'offline' | 'pending'
}

export function StatCard({ title, value, description, icon, className, status }: StatCardProps) {
  const statusClasses = status ? getStatusColorClasses(status) : null

  return (
    <Card
      className={cn(
        'glass glass-hover relative overflow-hidden',
        className
      )}
    >
      {status && <div className={cn('absolute left-0 right-0 top-0 h-[3px]', statusClasses?.bg)} aria-label={`status: ${status}`} />}
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[#8B95A8]">{title}</p>
          <p className="mt-1 font-mono text-2xl font-semibold leading-none text-[#E8EBF0]">
            {value ?? '—'}
          </p>
          {description && <p className="mt-1 truncate text-xs text-[#8B95A8]/70">{description}</p>}
        </div>
        {icon && (
          <div className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[rgba(8,10,15,0.6)] text-[#8B95A8]">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
