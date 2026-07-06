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
  const { entries, connected, error, switchSource } = useLogs(source)

  const handleSwitch = (value: LogSource) => {
    setSource(value)
    switchSource(value)
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <PageHeader title="Logs" description="实时查看 Panel 运行日志与请求日志">
        <div className="flex items-center gap-2">
          {sources.map((s) => (
            <Button
              key={s.value}
              variant={source === s.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSwitch(s.value)}
              className={cn(
                source === s.value
                  ? 'bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90'
                  : 'border-white/[0.08] bg-transparent text-[#8B95A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E8EBF0]'
              )}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      <div className="flex items-center gap-2 text-xs text-[#8B95A8]">
        <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-rose-400')} />
        {connected ? '已连接' : '未连接'}
        {error && <span className="ml-2 text-rose-400">{error.message}</span>}
      </div>

      <LogViewer entries={entries} />
    </div>
  )
}
