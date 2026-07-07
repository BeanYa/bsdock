import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react'
import { api } from '@/lib/api'
import { useNode } from '@/hooks/useNode'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getStatusColorClasses } from '@/lib/status'
import { Skeleton } from '@/components/ui/skeleton'

import { InstallCommandCard } from '@/components/install-command-card'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { InfoCard } from '@/components/info-card'
import { ResourceRing } from '@/components/resource-ring'
import { motion, useReducedMotion } from 'motion/react'

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
  const reduceMotion = useReducedMotion()

  const sectionMotion = (delay: number) => (
    reduceMotion
      ? {
          initial: false,
          animate: { opacity: 1 },
        }
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay },
        }
  )

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
        <Link
          to="/nodes"
          className="command-surface mt-4 inline-flex items-center justify-center rounded-md border border-white/[0.08] px-4 py-2 text-sm font-medium text-foreground opacity-100 hover:opacity-90"
        >
          Back to Nodes
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
  const metricCards = [
    {
      label: 'Network',
      value: formatSpeed(info.network_speed ?? info.net_speed),
    },
    {
      label: 'Packets',
      value: formatPackets(info.packets_per_sec ?? info.packets),
    },
    {
      label: 'Disk I/O',
      value: formatSpeed(info.disk_io),
    },
  ]

  return (
    <div className="space-y-6">
      <motion.section {...sectionMotion(0.1)}>
        <PageHeader title={node.name} description="Node details and system information">
          <Link
            to="/nodes"
            aria-label="Back to Nodes"
            className="command-surface inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] text-foreground opacity-100 hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </PageHeader>
      </motion.section>

      <motion.section
        {...sectionMotion(0.2)}
        className="command-surface relative overflow-hidden rounded-xl border border-white/[0.08] p-4 sm:p-5"
      >
        <div className={cn('absolute left-0 right-0 top-0 h-1', getStatusColorClasses(node.status).bg)} aria-hidden="true" />

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {node.platform || '—'}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Server Probe
                </span>
              </div>
              <div>
                <h2 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {node.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Node vitals, throughput, and hardware identity in one surface.
                </p>
              </div>
            </div>
            <StatusBadge status={node.status} variant="dot" />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,1fr)]">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.38)] p-4 sm:p-5">
                <ResourceRing
                  label="CPU"
                  percent={info.cpu_percent as number | null}
                  size="xl"
                  subtitle={info.cpu_cores != null ? `${info.cpu_cores} Core${Number(info.cpu_cores) > 1 ? 's' : ''}` : undefined}
                />
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.38)] p-4 sm:p-5">
                <ResourceRing
                  label="MEM"
                  percent={info.memory_total ? ((info.memory_used as number ?? 0) / (info.memory_total as number)) * 100 : null}
                  size="xl"
                  subtitle={memoryTotal > 0 ? `${formatBytes(memoryUsed)} / ${formatBytes(memoryTotal)}` : undefined}
                />
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.38)] p-4 sm:p-5">
                <ResourceRing
                  label="Disk"
                  percent={diskTotal > 0 ? (diskUsed / diskTotal) * 100 : null}
                  size="xl"
                  subtitle={diskTotal > 0 ? `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}` : undefined}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {metricCards.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-3 py-2.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-3 sm:p-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Total Data
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7DD3C0]/12">
                    <ArrowUp className="h-4 w-4 text-[#7DD3C0]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Sent
                    </p>
                    <p className="break-all font-mono text-xs font-semibold text-foreground">
                      {formatBytes(Number(networkSent))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C084FC]/12">
                    <ArrowDown className="h-4 w-4 text-[#C084FC]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Received
                    </p>
                    <p className="break-all font-mono text-xs font-semibold text-foreground">
                      {formatBytes(Number(networkReceived))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div data-testid="ip-section" className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-3 sm:p-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                IP Addresses
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    IPv4
                  </p>
                  <div className="mt-2 space-y-1">
                    {ipv4.length > 0 ? (
                      ipv4.map((ip, index) => (
                        <p key={`ipv4-${index}`} className="break-all font-mono text-xs font-semibold text-foreground">
                          {ip}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs font-semibold text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    IPv6
                  </p>
                  <div className="mt-2 space-y-1">
                    {ipv6.length > 0 ? (
                      ipv6.map((ip, index) => (
                        <p key={`ipv6-${index}`} className="break-all font-mono text-xs font-semibold text-foreground">
                          {ip}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs font-semibold text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
      </motion.section>

      <motion.section {...sectionMotion(0.3)}>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hardware</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard title="Hostname" value={info.hostname != null ? String(info.hostname) : undefined} />
          <InfoCard title="OS / Arch" value={Boolean(info.os) || Boolean(info.arch) ? `${info.os ? String(info.os) : '—'} / ${info.arch ? String(info.arch) : '—'}` : undefined} />
          <InfoCard title="Kernel" value={info.kernel != null ? String(info.kernel) : undefined} />
          <InfoCard title="Platform" value={node.platform} />
        </div>
      </motion.section>

      <motion.section {...sectionMotion(0.4)}>
        <InstallCommandCard
          installCommand={installCommand}
          loading={rotating}
          onGenerate={handleRotateToken}
        />
      </motion.section>
    </div>
  )
}
