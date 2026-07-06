import { Card, CardContent } from '@/components/ui/card'
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

  return (
    <Card className="glass relative overflow-hidden">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8892A0] sm:text-sm">Panel Probe</p>
            <h2 className="text-2xl font-semibold tracking-tight text-[#C5C6C7] sm:text-3xl">
              {status?.hostname ?? 'localhost'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Healthy
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="border-white/[0.08] bg-[rgba(8,10,15,0.45)]">
            <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
              <ResourceRing
                label="CPU"
                percent={cpuPercent}
                size="lg"
                subtitle={status?.cpu.cores ? `${status.cpu.cores} Core${status.cpu.cores > 1 ? 's' : ''}` : undefined}
              />
            </CardContent>
          </Card>
          <Card className="border-white/[0.08] bg-[rgba(8,10,15,0.45)]">
            <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
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
            </CardContent>
          </Card>
          <Card className="border-white/[0.08] bg-[rgba(8,10,15,0.45)]">
            <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
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
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Card className="border-white/[0.08] bg-[rgba(8,10,15,0.45)]">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2A3546]/60">
                  <Activity className="h-3.5 w-3.5 text-[#7DD3C0]" />
                </div>
                <div>
                  <p className="text-xs text-[#8892A0] sm:text-sm">WS Sent</p>
                  <p className="font-mono text-sm font-semibold text-[#C5C6C7] sm:text-base">{formatBytes(status?.network.sent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/[0.08] bg-[rgba(8,10,15,0.45)]">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2A3546]/60">
                  <Activity className="h-3.5 w-3.5 text-[#C084FC]" />
                </div>
                <div>
                  <p className="text-xs text-[#8892A0] sm:text-sm">WS Received</p>
                  <p className="font-mono text-sm font-semibold text-[#C5C6C7] sm:text-base">{formatBytes(status?.network.received)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
