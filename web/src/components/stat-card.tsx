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
        'command-surface relative overflow-hidden rounded-xl border-white/10',
        className
      )}
    >
      {status && <div className={cn('absolute left-0 right-0 top-0 h-[3px]', statusClasses?.bg)} aria-label={`status: ${status}`} />}
      <CardContent className="flex min-h-[132px] flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-xs font-semibold uppercase tracking-[0.24em] text-[#8B95A8]">{title}</p>
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#8B95A8]">
              {icon}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-3xl font-semibold leading-none text-[#E8EBF0]">
            {value ?? '—'}
          </p>
          {description && <p className="mt-2 text-xs text-[#8B95A8]/80 sm:text-sm">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
