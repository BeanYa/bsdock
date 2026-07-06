import { Card, CardContent } from '@/components/ui/card'

interface InfoCardProps {
  title: string
  value?: string
}

export function InfoCard({ title, value }: InfoCardProps) {
  return (
    <Card className="border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8B95A8] sm:text-sm">{title}</p>
        <p className="mt-1 break-words font-mono text-sm font-semibold leading-tight text-[#E8EBF0] sm:text-base">
          {value ?? '—'}
        </p>
      </CardContent>
    </Card>
  )
}
