import { CardContent } from '@/components/ui/card'
import { GlassCard } from '@/components/glass-card'
import { Activity } from 'lucide-react'
import { ResourceRing } from '@/components/resource-ring'
import { InfoCard } from '@/components/info-card'
import type { PanelStatus } from '@/lib/api'

interface PanelProbeCardProps {
  status: PanelStatus | null
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`
}

function percent(used?: number, total?: number): number | null {
  if (used === undefined || total === undefined || total <= 0) return null
  return Math.min(100, Math.max(0, (used / total) * 100))
}

export function PanelProbeCard({ status }: PanelProbeCardProps) {
  const cpuPercent = status?.cpu.percent ?? null
  const memPercent = percent(status?.memory.used, status?.memory.total)
  const diskPercent = percent(status?.disk.used, status?.disk.total)
  const health = !status
    ? { label: 'Unknown', className: 'border-white/[0.08] bg-white/[0.05] text-[#8B95A8]', dot: 'bg-[#8B95A8]' }
    : status.nodes.total === 0 || status.nodes.online > 0
      ? { label: 'Healthy', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' }
      : { label: 'Degraded', className: 'border-amber-500/30 bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' }
  const stats = [
    {
      title: 'WS Sent',
      value: formatBytes(status?.network.sent),
      tint: 'text-[#7DD3C0]',
      glow: 'bg-[#7DD3C0]/12',
    },
    {
      title: 'WS Received',
      value: formatBytes(status?.network.received),
      tint: 'text-[#C084FC]',
      glow: 'bg-[#C084FC]/12',
    },
  ]

  return (
    <GlassCard hover={false} className="command-surface">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8892A0] sm:text-sm">Panel runtime</p>
            <h2 className="text-2xl font-semibold tracking-tight text-[#C5C6C7] sm:text-3xl">
              {status?.hostname ?? '—'}
            </h2>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${health.className}`}>
            <span className={`h-2 w-2 rounded-full ${health.dot}`} />
            {health.label}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
              <ResourceRing
                label="CPU"
                percent={cpuPercent}
                size="lg"
                subtitle={status?.cpu.cores ? `${status.cpu.cores} Core${status.cpu.cores > 1 ? 's' : ''}` : undefined}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
              <ResourceRing
                label="MEM"
                percent={memPercent}
                size="lg"
                subtitle={
                  status?.memory.used !== undefined && status?.memory.total !== undefined
                    ? `${formatBytes(status.memory.used)} / ${formatBytes(status.memory.total)}`
                    : undefined
                }
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
              <ResourceRing
                label="Disk"
                percent={diskPercent}
                size="lg"
                subtitle={
                  status?.disk.used !== undefined && status?.disk.total !== undefined
                    ? `${formatBytes(status.disk.used)} / ${formatBytes(status.disk.total)}`
                    : undefined
                }
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <InfoCard
                title="IP"
                value={status && status.ips.length > 0 ? status.ips.join(', ') : undefined}
              />
              <InfoCard
                title="CPU"
                value={
                  status?.cpu.cores
                    ? `${status.cpu.cores} Core${status.cpu.cores > 1 ? 's' : ''} @ ${status.platform}/${status.arch}`
                    : undefined
                }
              />
              <InfoCard title="Version" value={status?.version ?? undefined} />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {stats.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.glow}`}>
                      <Activity className={`h-4 w-4 ${item.tint}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8892A0]">{item.title}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-[#C5C6C7] sm:text-base">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </GlassCard>
  )
}
