import { cn } from '@/lib/utils'
import type { LogEntry } from '@/hooks/useLogs'

interface LogLineProps {
  entry: LogEntry
}

export function LogLine({ entry }: LogLineProps) {
  const levelClass =
    {
      INFO: 'text-emerald-400',
      WARN: 'text-amber-400',
      ERROR: 'text-rose-400',
      DEBUG: 'text-slate-400',
    }[entry.level] || 'text-[#E8EBF0]'

  return (
    <div className="flex gap-3 py-0.5 font-mono text-xs leading-relaxed">
      <span className="shrink-0 text-[#8B95A8]">{entry.timestamp}</span>
      <span className={cn('w-12 shrink-0 font-bold', levelClass)}>{entry.level}</span>
      <span className="break-all text-[#E8EBF0]">{entry.message}</span>
    </div>
  )
}
