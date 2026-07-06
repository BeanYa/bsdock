import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'dot'
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const normalized = status.toLowerCase()

  const palette =
    normalized === 'online'
      ? 'bg-[#39FF14]/15 text-[#39FF14] hover:bg-[#39FF14]/25 border-[#39FF14]/40 shadow-[0_0_12px_rgba(57,255,20,0.08)]'
      : normalized === 'offline'
      ? 'bg-[#FFC107]/15 text-[#FFC107] hover:bg-[#FFC107]/25 border-[#FFC107]/40 shadow-[0_0_12px_rgba(255,193,7,0.08)]'
      : 'bg-[#FF4D4D]/15 text-[#FF4D4D] hover:bg-[#FF4D4D]/25 border-[#FF4D4D]/40 shadow-[0_0_12px_rgba(255,77,77,0.08)]'

  if (variant === 'dot') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wider',
          palette
        )}
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            normalized === 'online'
              ? 'bg-[#39FF14]'
              : normalized === 'offline'
              ? 'bg-[#FFC107]'
              : 'bg-[#FF4D4D]'
          )}
        />
        {status}
      </span>
    )
  }

  return (
    <Badge variant="outline" className={cn('border font-mono text-xs uppercase tracking-wider', palette)}>
      {status}
    </Badge>
  )
}
