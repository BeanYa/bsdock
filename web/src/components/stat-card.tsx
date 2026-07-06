import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value?: number | string
  description?: string
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, description, icon, className }: StatCardProps) {
  return (
    <Card className={cn('border-[#2A3546] bg-[#1F2833]', className)}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[#8892A0] sm:text-sm">{title}</p>
          <p className="mt-1 font-mono text-2xl font-semibold leading-none text-[#C5C6C7] sm:text-3xl">
            {value ?? '—'}
          </p>
          {description && (
            <p className="mt-1 truncate text-xs text-[#8892A0]/70 sm:text-sm">{description}</p>
          )}
        </div>
        {icon && (
          <div className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B0C10]/60 text-[#8892A0]">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
