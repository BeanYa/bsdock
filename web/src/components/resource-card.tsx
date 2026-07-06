import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ResourceCardProps {
  title: string
  used?: number
  total?: number
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes === 0) return '0.00 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

export function ResourceCard({ title, used, total }: ResourceCardProps) {
  const safeUsed = Number.isFinite(used) ? used : null
  const safeTotal = Number.isFinite(total) ? total : null
  const ratio = safeUsed != null && safeTotal != null && safeTotal > 0 ? safeUsed / safeTotal : null
  let barColor = 'bg-[#39FF14]'
  if (ratio !== null && ratio > 0.9) barColor = 'bg-[#FF4D4D]'
  else if (ratio !== null && ratio > 0.7) barColor = 'bg-[#FFC107]'

  const valueText =
    safeUsed != null && safeTotal != null
      ? `${formatBytes(safeUsed)} / ${formatBytes(safeTotal)}`
      : safeUsed != null
      ? formatBytes(safeUsed)
      : '—'

  return (
    <Card className="glass">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8B95A8]">{title}</p>
        <p className="mt-1 font-mono text-lg font-semibold leading-tight text-[#E8EBF0]">{valueText}</p>
        {ratio !== null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#0B0C10]">
            <div
              className={cn('h-full transition-all', barColor)}
              style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
