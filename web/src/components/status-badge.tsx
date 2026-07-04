import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()

  const className =
    normalized === 'online'
      ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20 dark:text-emerald-400'
      : normalized === 'offline'
      ? 'bg-red-500/15 text-red-600 hover:bg-red-500/25 border-red-500/20 dark:text-red-400'
      : 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/20 dark:text-amber-400'

  return (
    <Badge variant="outline" className={cn('border', className)}>
      {status}
    </Badge>
  )
}
