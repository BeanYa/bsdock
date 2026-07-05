import { Card, CardContent } from '@/components/ui/card'

interface InfoCardProps {
  title: string
  value?: string
}

export function InfoCard({ title, value }: InfoCardProps) {
  return (
    <Card className="border-[#2A3546] bg-[#1F2833]">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8892A0]">{title}</p>
        <p className="mt-1 break-words font-mono text-lg font-semibold leading-tight text-[#C5C6C7]">
          {value ?? '—'}
        </p>
      </CardContent>
    </Card>
  )
}
