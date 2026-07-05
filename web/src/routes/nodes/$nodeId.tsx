import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { useNode } from '@/hooks/useNode'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getStatusColorClasses } from '@/lib/status'
import { formatRelativeTime } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { InstallCommandCard } from '@/components/install-command-card'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { InfoCard } from '@/components/info-card'
import { ResourceCard } from '@/components/resource-card'
import { ResourceRing } from '@/components/resource-ring'

export const Route = createFileRoute('/nodes/$nodeId')({
  component: NodeDetailPage,
})

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
  const memoryUsed = Number(info.memory_used || 0)
  const memoryTotal = Number(info.memory_total || 0)
  const diskUsed = Number(info.disk_total) - Number(info.disk_free || 0)
  const diskTotal = Number(info.disk_total)

  return (
    <div className="space-y-6">
      <PageHeader title={node.name} description="Node details and system information">
        <Link to="/nodes">
          <Button variant="outline" size="icon" className="border-[#2A3546] bg-[#1F2833] text-[#C5C6C7] hover:bg-[#2A3546] hover:text-[#C5C6C7]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </PageHeader>

      {/* Status banner */}
      <div className="relative overflow-hidden rounded-lg border border-[#2A3546] bg-[#1F2833] p-4">
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-2',
            getStatusColorClasses(node.status).bg
          )}
          aria-hidden="true"
        />
        <div className="pl-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={node.status} />
            <span className="text-sm text-[#8892A0]">
              Last seen: {formatRelativeTime(node.last_seen_at)}
            </span>
            <span className="text-sm text-[#8892A0]">
              Uptime: {info.uptime != null ? `${Number(info.uptime).toLocaleString()}s` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Hardware */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8892A0]">Hardware</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard title="Hostname" value={info.hostname != null ? String(info.hostname) : undefined} />
          <InfoCard title="OS / Arch" value={Boolean(info.os) || Boolean(info.arch) ? `${info.os ? String(info.os) : '—'} / ${info.arch ? String(info.arch) : '—'}` : undefined} />
          <InfoCard title="Kernel" value={info.kernel != null ? String(info.kernel) : undefined} />
          <InfoCard title="CPU" value={info.cpu_model != null || info.cpu_cores != null ? `${info.cpu_model != null ? String(info.cpu_model) : '—'} (${info.cpu_cores != null ? String(info.cpu_cores) : '—'} cores)` : undefined} />
          <InfoCard title="Platform" value={node.platform} />
        </div>
      </section>

      {/* Resources */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8892A0]">Resources</h2>
        <div className="rounded-lg border border-[#2A3546] bg-[#1F2833] p-4">
          <div className="flex items-center justify-center gap-8">
            <ResourceRing label="CPU" percent={info.cpu_percent as number | null} size="md" />
            <ResourceRing label="MEM" percent={info.memory_total ? ((info.memory_used as number ?? 0) / (info.memory_total as number)) * 100 : null} size="md" />
            <ResourceRing label="Disk" percent={diskTotal > 0 ? (diskUsed / diskTotal) * 100 : null} size="md" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ResourceCard title="Memory" used={memoryUsed} total={memoryTotal} />
          <ResourceCard title="Disk" used={diskUsed} total={diskTotal} />
        </div>
      </section>

      {/* Network */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8892A0]">Network</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard title="Uptime" value={info.uptime != null ? `${Number(info.uptime).toLocaleString()}s` : undefined} />
          <InfoCard title="IPs" value={Array.isArray(info.ips) ? info.ips.join(', ') : undefined} />
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
