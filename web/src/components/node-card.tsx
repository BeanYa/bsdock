import { Eye, RotateCcw } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ResourceRing } from '@/components/resource-ring'
import { StatusBadge } from '@/components/status-badge'
import { getStatusColorClasses, type NodeStatus } from '@/lib/status'
import { formatRelativeTime } from '@/lib/time'
import { cn } from '@/lib/utils'

export type { NodeStatus }

export interface Node {
  id: string
  name: string
  status: NodeStatus
  platform?: string
  system_info?: Record<string, unknown>
  last_seen_at?: string
  created_at: string
}

interface NodeCardProps {
  node: Node
  onInstallCommand: (id: string) => void
  onReset: (id: string) => void
  onRotateToken: (id: string) => void
}

function getPrimaryIP(info?: Record<string, unknown>): string {
  const ips = info?.ips
  if (Array.isArray(ips) && ips.length > 0) return String(ips[0])
  return '—'
}

function getCpuPercent(info?: Record<string, unknown>): number | null {
  const value = info?.cpu_percent
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getMemoryPercent(info?: Record<string, unknown>): number | null {
  const total = Number(info?.memory_total ?? NaN)
  const free = Number(info?.memory_free ?? NaN)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(free)) return null
  const used = total - free
  return Math.min(100, Math.max(0, (used / total) * 100))
}

function getDiskPercent(info?: Record<string, unknown>): number | null {
  const total = Number(info?.disk_total ?? NaN)
  const free = Number(info?.disk_free ?? NaN)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(free)) return null
  const used = total - free
  return Math.min(100, Math.max(0, (used / total) * 100))
}

export function NodeCard({ node, onInstallCommand, onReset }: NodeCardProps) {
  const info = node.system_info
  const statusClasses = getStatusColorClasses(node.status)
  const isOnline = node.status === 'online'

  return (
    <Card
      data-testid="node-card"
      className={cn(
        'relative flex flex-col overflow-hidden border-[#2A3546] bg-[#1F2833] p-4 transition-colors hover:bg-[#2A3546]'
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1',
          statusClasses.bg
        )}
        aria-hidden="true"
      />

      <Link
        to="/nodes/$nodeId"
        params={{ nodeId: node.id }}
        aria-label={`View details for ${node.name}`}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
      />

      <div className="relative z-10 pl-3 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-base font-semibold tracking-tight text-[#C5C6C7]"
              title={node.name}
            >
              {node.name}
            </h3>
          </div>
          <StatusBadge status={node.status} />
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-[#8892A0]">
          <span className="rounded border border-[#2A3546] bg-[#0B0C10] px-1.5 py-0.5 font-mono uppercase">
            {node.platform || '—'}
          </span>
          <span className="font-mono">{getPrimaryIP(info)}</span>
          <span className="ml-auto">{formatRelativeTime(node.last_seen_at)}</span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 sm:gap-5">
          <ResourceRing label="CPU" percent={getCpuPercent(info)} />
          <ResourceRing label="MEM" percent={getMemoryPercent(info)} />
          <ResourceRing label="Disk" percent={getDiskPercent(info)} />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center pointer-events-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onInstallCommand(node.id)}
            className="flex-1 border-[#2A3546] bg-[#0B0C10] text-[#C5C6C7] hover:border-[#00F0FF] hover:bg-[#00F0FF]/10 hover:text-[#00F0FF]"
          >
            <Eye className="mr-2 h-4 w-4" />
            Install Command
          </Button>
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReset(node.id)}
              className="flex-1 border-[#2A3546] bg-[#0B0C10] text-[#C5C6C7] hover:border-[#FFC107] hover:bg-[#FFC107]/10 hover:text-[#FFC107]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
