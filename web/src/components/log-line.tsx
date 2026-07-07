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

  const sourceLabel = entry.source === 'runtime' ? 'runtime' : 'request'

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5 font-mono text-xs leading-relaxed sm:flex-row sm:items-start sm:gap-3">
      <div className="flex shrink-0 items-center gap-2 sm:min-w-[16rem]">
        <span className="text-[#A7B0C2]">{entry.timestamp}</span>
        <span className={cn('w-12 shrink-0 font-bold', levelClass)}>{entry.level}</span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#8B95A8]">
          {sourceLabel}
        </span>
      </div>
      <span className="break-all text-[#E8EBF0]">{entry.message}</span>
    </div>
  )
}
