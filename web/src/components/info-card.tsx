import { Card, CardContent } from '@/components/ui/card'

interface InfoCardProps {
  title: string
  value?: string
}

export function InfoCard({ title, value }: InfoCardProps) {
  return (
    <Card className="command-surface rounded-xl border-white/[0.08] shadow-none">
      <CardContent className="space-y-2 p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
          {title}
        </p>
        <p className="break-all font-mono text-sm font-semibold leading-tight text-foreground sm:text-[15px]">
          {value ?? '—'}
        </p>
      </CardContent>
    </Card>
  )
}
