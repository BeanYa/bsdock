import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/nodes/$nodeId')({
  component: NodeDetailPage,
})

type NodeDetail = {
  id: string
  name: string
  status: 'pending' | 'online' | 'offline'
  system_info?: Record<string, unknown>
}

function NodeDetailPage() {
  const { nodeId } = Route.useParams()
  const [node, setNode] = useState<NodeDetail | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const data = await api.getNode(nodeId)
      setNode(data as NodeDetail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load node')
    }
  }

  useEffect(() => {
    load()
  }, [nodeId])

  if (error) return <div className="text-destructive">{error}</div>
  if (!node) return <div className="text-muted-foreground">Loading...</div>

  const info = node.system_info || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{node.name}</h1>
        <Badge variant={node.status === 'online' ? 'default' : node.status === 'offline' ? 'destructive' : 'secondary'}>
          {node.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Hostname" value={String(info.hostname || '-')} />
        <InfoCard title="OS / Arch" value={`${info.os || '-'} / ${info.arch || '-'}`} />
        <InfoCard title="Kernel" value={String(info.kernel || '-')} />
        <InfoCard title="CPU" value={`${info.cpu_model || '-'} (${info.cpu_cores || '-'} cores)`} />
        <InfoCard title="Memory" value={formatBytes(Number(info.memory_total))} />
        <InfoCard title="Disk" value={`${formatBytes(Number(info.disk_total))} total / ${formatBytes(Number(info.disk_free))} free`} />
        <InfoCard title="IPs" value={Array.isArray(info.ips) ? info.ips.join(', ') : '-'} />
        <InfoCard title="Uptime" value={`${info.uptime ?? '-'}s`} />
      </div>
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
        <p className="text-lg font-semibold">{value || '-'}</p>
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
