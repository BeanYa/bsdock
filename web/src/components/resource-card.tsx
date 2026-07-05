import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ResourceCardProps {
  title: string
  used?: number
  total?: number
  unit?: string
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '—'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

export function ResourceCard({ title, used, total, unit }: ResourceCardProps) {
  const ratio = used && total && total > 0 ? used / total : null
  let barColor = 'bg-[#39FF14]'
  if (ratio && ratio > 0.9) barColor = 'bg-[#FF4D4D]'
  else if (ratio && ratio > 0.7) barColor = 'bg-[#FFC107]'

  const valueText =
    used && total
      ? `${formatBytes(used)} / ${formatBytes(total)}`
      : used
      ? `${formatBytes(used)}${unit ? ` ${unit}` : ''}`
      : '—'

  return (
    <Card className="border-[#2A3546] bg-[#1F2833]">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8892A0]">{title}</p>
        <p className="mt-1 font-mono text-lg font-semibold leading-tight text-[#C5C6C7]">{valueText}</p>
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
