import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react'
import { api } from '@/lib/api'
import { useNode } from '@/hooks/useNode'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getStatusColorClasses } from '@/lib/status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

import { InstallCommandCard } from '@/components/install-command-card'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { InfoCard } from '@/components/info-card'
import { ResourceRing } from '@/components/resource-ring'

export const Route = createFileRoute('/nodes/$nodeId')({
  component: NodeDetailPage,
})

function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`
}

function formatSpeed(value?: unknown): string {
  const num = Number(value)
  if (value === undefined || value === null || !Number.isFinite(num)) return '—'
  return `${formatBytes(num)}/s`
}

function formatPackets(value?: unknown): string {
  const num = Number(value)
  if (value === undefined || value === null || !Number.isFinite(num)) return '—'
  return `${num.toLocaleString()} p/s`
}

function isIPv4(ip: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)
}

function isIPv6(ip: string): boolean {
  return /:/.test(ip)
}

function getIPGroups(info: Record<string, unknown>): { ipv4: string[]; ipv6: string[] } {
  const ips = info.ips
  if (!Array.isArray(ips)) return { ipv4: [], ipv6: [] }
  const ipv4: string[] = []
  const ipv6: string[] = []
  for (const ip of ips) {
    const s = String(ip)
    if (isIPv4(s)) ipv4.push(s)
    else if (isIPv6(s)) ipv6.push(s)
  }
  return { ipv4, ipv6 }
}

function getUptime(seconds?: unknown): string {
  const num = Number(seconds)
  if (seconds === undefined || seconds === null || !Number.isFinite(num)) return '—'
  const days = Math.floor(num / 86400)
  const hours = Math.floor((num % 86400) / 3600)
  const mins = Math.floor((num % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function NodeDetailPage() {
  const { nodeId } = Route.useParams()
  const { node, loading } = useNode(nodeId)
  const { toast } = useToast()
  const [installCommand, setInstallCommand] = useState('')
  const [rotating, setRotating] = useState(false)

  const handleRotateToken = async () => {
    setRotating(true)
    try {
      const data = await api.rotateToken(nodeId)
      setInstallCommand(data.install_command)
    } catch (err) {
      toast({
        title: '生成安装命令失败',
        description: err instanceof Error ? err.message : '无法轮换 Token',
        variant: 'destructive',
      })
    } finally {
      setRotating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <div className="flex flex-col space-y-1.5 p-6 pb-2">
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="p-6 pt-0">
                <Skeleton className="h-6 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!node) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-medium">Node not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">The requested node does not exist or has been removed.</p>
        <Link to="/nodes">
          <Button className="mt-4">Back to Nodes</Button>
        </Link>
      </div>
    )
  }

  const info = node.system_info || {}
  const { ipv4, ipv6 } = getIPGroups(info)
  const memoryUsed = Number(info.memory_used || 0)
  const memoryTotal = Number(info.memory_total || 0)
  const diskUsed = Number(info.disk_total) - Number(info.disk_free || 0)
  const diskTotal = Number(info.disk_total)
  const networkSent = info.network_sent ?? info.net_sent
  const networkReceived = info.network_received ?? info.net_received

  return (
    <div className="space-y-6">
      <PageHeader title={node.name} description="Node details and system information">
        <Link to="/nodes">
          <Button variant="outline" size="icon" className="border-[#2A3546] bg-[#1F2833] text-[#C5C6C7] hover:bg-[#2A3546] hover:text-[#C5C6C7]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </PageHeader>

      {/* Server Probe style overview */}
      <div className="relative overflow-hidden rounded-2xl border border-[#2A3546] bg-[#1F2833] p-4 sm:p-5">
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-1.5',
            getStatusColorClasses(node.status).bg
          )}
          aria-hidden="true"
        />

        <div className="pl-3 sm:pl-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8892A0]">Server Probe</span>
              <h2 className="text-xl font-semibold tracking-tight text-[#C5C6C7] sm:text-2xl">{node.name}</h2>
            </div>
            <StatusBadge status={node.status} variant="dot" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="border-[#2A3546] bg-[#0B0C10]/40">
              <CardContent className="flex flex-col items-center justify-center p-4 sm:p-5">
                <ResourceRing
                  label="CPU"
                  percent={info.cpu_percent as number | null}
                  size="xl"
                  subtitle={info.cpu_cores != null ? `${info.cpu_cores} Core${Number(info.cpu_cores) > 1 ? 's' : ''}` : undefined}
                />
              </CardContent>
            </Card>
            <Card className="border-[#2A3546] bg-[#0B0C10]/40">
              <CardContent className="flex flex-col items-center justify-center p-4 sm:p-5">
                <ResourceRing
                  label="MEM"
                  percent={info.memory_total ? ((info.memory_used as number ?? 0) / (info.memory_total as number)) * 100 : null}
                  size="xl"
                  subtitle={memoryTotal > 0 ? `${formatBytes(memoryUsed)} / ${formatBytes(memoryTotal)}` : undefined}
                />
              </CardContent>
            </Card>
            <Card className="border-[#2A3546] bg-[#0B0C10]/40">
              <CardContent className="flex flex-col items-center justify-center p-4 sm:p-5">
                <ResourceRing
                  label="Disk"
                  percent={diskTotal > 0 ? (diskUsed / diskTotal) * 100 : null}
                  size="xl"
                  subtitle={diskTotal > 0 ? `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}` : undefined}
                />
              </CardContent>
            </Card>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg bg-[#0B0C10]/60 px-3 py-2 sm:flex-col sm:items-start sm:justify-center sm:gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#8892A0]">Network</span>
              <span className="font-mono text-xs font-semibold text-[#C5C6C7]">{formatSpeed(info.network_speed ?? info.net_speed)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#0B0C10]/60 px-3 py-2 sm:flex-col sm:items-start sm:justify-center sm:gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#8892A0]">Packets</span>
              <span className="font-mono text-xs font-semibold text-[#C5C6C7]">{formatPackets(info.packets_per_sec ?? info.packets)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#0B0C10]/60 px-3 py-2 sm:flex-col sm:items-start sm:justify-center sm:gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#8892A0]">Disk I/O</span>
              <span className="font-mono text-xs font-semibold text-[#C5C6C7]">{formatSpeed(info.disk_io)}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#2A3546]/60 bg-[#0B0C10]/40 p-3 sm:p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#8892A0]">Total Data</h3>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2A3546]/60">
                    <ArrowUp className="h-3.5 w-3.5 text-[#7DD3C0]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8892A0]">Sent</p>
                    <p className="truncate font-mono text-xs font-semibold text-[#C5C6C7]">{formatBytes(Number(networkSent))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2A3546]/60">
                    <ArrowDown className="h-3.5 w-3.5 text-[#C084FC]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8892A0]">Received</p>
                    <p className="truncate font-mono text-xs font-semibold text-[#C5C6C7]">{formatBytes(Number(networkReceived))}</p>
                  </div>
                </div>
              </div>
            </div>

            <div data-testid="ip-section" className="rounded-xl border border-[#2A3546]/60 bg-[#0B0C10]/40 p-3 sm:p-4">
              <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#8892A0]">IP Addresses</h3>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#8892A0]">IPv4</p>
                  <div className="mt-1 space-y-0.5">
                    {ipv4.length > 0 ? (
                      ipv4.map((ip, index) => (
                        <p key={`ipv4-${index}`} className="truncate font-mono text-xs font-semibold text-[#C5C6C7]">{ip}</p>
                      ))
                    ) : (
                      <p className="text-xs font-semibold text-[#8892A0]">—</p>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#8892A0]">IPv6</p>
                  <div className="mt-1 space-y-0.5">
                    {ipv6.length > 0 ? (
                      ipv6.map((ip, index) => (
                        <p key={`ipv6-${index}`} className="break-all font-mono text-xs font-semibold text-[#C5C6C7]">{ip}</p>
                      ))
                    ) : (
                      <p className="text-xs font-semibold text-[#8892A0]">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <InfoCard
              title="CPU"
              value={
                info.cpu_model != null || info.cpu_cores != null
                  ? `${info.cpu_model != null ? String(info.cpu_model) : '—'} (${info.cpu_cores != null ? String(info.cpu_cores) : '—'} cores)`
                  : undefined
              }
            />
            <InfoCard title="Uptime" value={getUptime(info.uptime)} />
            <InfoCard title="Version" value={info.version != null ? String(info.version) : undefined} />
          </div>
        </div>
      </div>

      {/* Hardware */}
      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#8892A0]">Hardware</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard title="Hostname" value={info.hostname != null ? String(info.hostname) : undefined} />
          <InfoCard title="OS / Arch" value={Boolean(info.os) || Boolean(info.arch) ? `${info.os ? String(info.os) : '—'} / ${info.arch ? String(info.arch) : '—'}` : undefined} />
          <InfoCard title="Kernel" value={info.kernel != null ? String(info.kernel) : undefined} />
          <InfoCard title="Platform" value={node.platform} />
        </div>
      </section>

      <InstallCommandCard
        installCommand={installCommand}
        loading={rotating}
        onGenerate={handleRotateToken}
      />
    </div>
  )
}
