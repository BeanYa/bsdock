import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { useNode } from '@/hooks/useNode'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InstallCommandCard } from '@/components/install-command-card'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'

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
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={node.name}
        description="Node details and system information"
      >
        <StatusBadge status={node.status} />
        <Link to="/nodes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Hostname" value={String(info.hostname || '-')} />
        <InfoCard title="OS / Arch" value={`${info.os || '-'} / ${info.arch || '-'}`} />
        <InfoCard title="Kernel" value={String(info.kernel || '-')} />
        <InfoCard title="CPU" value={`${info.cpu_model || '-'} (${info.cpu_cores || '-'} cores)`} />
        <InfoCard title="Memory" value={formatBytes(Number(info.memory_total))} />
        <InfoCard title="Disk" value={`${formatBytes(Number(info.disk_total))} total / ${formatBytes(Number(info.disk_free))} free`} />
        <InfoCard title="IPs" value={Array.isArray(info.ips) ? info.ips.join(', ') : '-'} />
        <InfoCard title="Uptime" value={`${info.uptime ?? '-'}s`} />
        <InfoCard title="Platform" value={String(node.platform || '-')} />
      </div>

      <InstallCommandCard
        installCommand={installCommand}
        loading={rotating}
        onGenerate={handleRotateToken}
      />
    </div>
  )
}

function InfoCard({ title, value }: { title: string; value?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold break-words font-mono tabular-nums">{value || '-'}</p>
      </CardContent>
    </Card>
  )
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes === 0) return '-'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}
