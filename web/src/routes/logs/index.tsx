import { useState } from 'react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'
import { useLogs, type LogSource } from '@/hooks/useLogs'
import { LogViewer } from '@/components/log-viewer'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/logs/')({
  component: LogsPage,
})

const sources: { value: LogSource; label: string }[] = [
  { value: 'runtime', label: '运行日志' },
  { value: 'request', label: '请求日志' },
]

function LogsPage() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />
  }

  const [source, setSource] = useState<LogSource>('runtime')
  const { entries, connected, error } = useLogs(source)

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <PageHeader title="Logs" description="在同一条 command surface 中观察 Panel 运行态与请求链路。">
        <div className="inline-flex rounded-lg border border-white/[0.08] bg-black/20 p-1">
          {sources.map((s) => (
            <Button
              key={s.value}
              variant="ghost"
              size="sm"
              onClick={() => setSource(s.value)}
              className={cn(
                'rounded-md px-3 text-sm',
                source === s.value
                  ? 'bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90'
                  : 'bg-transparent text-[#8B95A8] hover:bg-white/[0.04] hover:text-[#E8EBF0]'
              )}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      <div className="command-surface flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('h-2.5 w-2.5 rounded-full', connected ? 'bg-emerald-400' : 'bg-rose-400')} />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8B95A8]">Stream status</p>
            <p className="text-sm font-medium text-[#E8EBF0]">{connected ? '已连接' : '未连接'}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 text-xs text-[#8B95A8]">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 font-medium uppercase tracking-[0.14em] text-[#8B95A8]">
            {source === 'runtime' ? 'Runtime stream' : 'Request stream'}
          </span>
          {error && <span className="min-w-0 text-sm text-rose-400">{error.message}</span>}
        </div>
      </div>

      <LogViewer entries={entries} />
    </div>
  )
}
