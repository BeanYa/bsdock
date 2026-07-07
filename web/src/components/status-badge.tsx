import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'dot'
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const normalized = status.toLowerCase()
  const tone =
    normalized === 'online'
      ? {
          text: 'text-[#39FF14]',
          accent: 'shadow-[inset_0_0_0_1px_rgba(57,255,20,0.22),0_0_12px_rgba(57,255,20,0.08)]',
          dot: 'bg-[#39FF14]',
        }
      : normalized === 'offline'
      ? {
          text: 'text-[#FFC107]',
          accent: 'shadow-[inset_0_0_0_1px_rgba(255,193,7,0.22),0_0_12px_rgba(255,193,7,0.08)]',
          dot: 'bg-[#FFC107]',
        }
      : {
          text: 'text-[#FF4D4D]',
          accent: 'shadow-[inset_0_0_0_1px_rgba(255,77,77,0.22),0_0_12px_rgba(255,77,77,0.08)]',
          dot: 'bg-[#FF4D4D]',
        }

  const shell =
    'border border-white/[0.08] bg-[rgba(8,10,15,0.45)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm'

  if (variant === 'dot') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]',
          shell,
          tone.text,
          tone.accent
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', tone.dot)} />
        {status}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]',
        shell,
        tone.text,
        tone.accent
      )}
    >
      {status}
    </span>
  )
}
