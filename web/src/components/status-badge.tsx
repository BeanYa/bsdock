import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()

  const className =
    normalized === 'online'
      ? 'bg-[#39FF14]/15 text-[#39FF14] hover:bg-[#39FF14]/25 border-[#39FF14]/30'
      : normalized === 'offline'
      ? 'bg-[#FFC107]/15 text-[#FFC107] hover:bg-[#FFC107]/25 border-[#FFC107]/30'
      : 'bg-[#FF4D4D]/15 text-[#FF4D4D] hover:bg-[#FF4D4D]/25 border-[#FF4D4D]/30'

  return (
    <Badge variant="outline" className={cn('border font-mono text-xs uppercase tracking-wider', className)}>
      {status.toUpperCase()}
    </Badge>
  )
}
