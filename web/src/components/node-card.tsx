import { useEffect, useState } from 'react'
import { Eye, MoreHorizontal, RotateCcw } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/glass-card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const usedRaw = Number(info?.memory_used ?? NaN)
  if (!Number.isFinite(total) || total <= 0) return null
  if (Number.isFinite(free)) {
    return Math.min(100, Math.max(0, ((total - free) / total) * 100))
  }
  if (Number.isFinite(usedRaw)) {
    return Math.min(100, Math.max(0, (usedRaw / total) * 100))
  }
  return null
}

function getDiskPercent(info?: Record<string, unknown>): number | null {
  const total = Number(info?.disk_total ?? NaN)
  const free = Number(info?.disk_free ?? NaN)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(free)) return null
  const used = total - free
  return Math.min(100, Math.max(0, (used / total) * 100))
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) return ''
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`
}

function getCpuSubtitle(info?: Record<string, unknown>): string | undefined {
  const cores = info?.cpu_cores
  if (typeof cores === 'number' && Number.isFinite(cores)) return `${cores} Core${cores > 1 ? 's' : ''}`
  return undefined
}

function getMemorySubtitle(info?: Record<string, unknown>): string | undefined {
  const total = Number(info?.memory_total ?? NaN)
  const used = Number(info?.memory_used ?? NaN)
  if (!Number.isFinite(total) || total <= 0) return undefined
  const usedSafe = Number.isFinite(used) && used >= 0 ? used : null
  return usedSafe != null ? `${formatBytes(usedSafe)} / ${formatBytes(total)}` : formatBytes(total)
}

function getDiskSubtitle(info?: Record<string, unknown>): string | undefined {
  const total = Number(info?.disk_total ?? NaN)
  const free = Number(info?.disk_free ?? NaN)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(free)) return undefined
  return `${formatBytes(total - free)} / ${formatBytes(total)}`
}

function getUptime(info?: Record<string, unknown>): string | undefined {
  const uptime = info?.uptime
  if (typeof uptime === 'number' && Number.isFinite(uptime)) {
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }
  return undefined
}

function useIsBelowSm() {
  const [isBelow, setIsBelow] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 639px)').matches
  })

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const update = () => setIsBelow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isBelow
}

export function NodeCard({ node, onInstallCommand, onReset, onRotateToken }: NodeCardProps) {
  const info = node.system_info
  const statusClasses = getStatusColorClasses(node.status)
  const isOnline = node.status === 'online'
  const ringSize = useIsBelowSm() ? 'sm' : 'md'

  return (
    <GlassCard className="group flex flex-col p-4">
      <div
        className={cn(
          'absolute left-0 right-0 top-0 h-[3px] transition-opacity',
          statusClasses.bg,
          'group-hover:status-pulse'
        )}
        aria-hidden="true"
      />

      <Link
        to="/nodes/$nodeId"
        params={{ nodeId: node.id }}
        aria-label={`View details for ${node.name}`}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
      />

      <div data-testid="node-card" className="relative z-10 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8B95A8]">
              Node
            </span>
            <h3
              className="truncate text-lg font-semibold tracking-tight text-[#E8EBF0]"
              title={node.name}
            >
              {node.name}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={node.status} variant="dot" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto -mr-2 -mt-1 h-8 w-8 shrink-0 text-[#8B95A8] hover:bg-[rgba(8,10,15,0.45)] hover:text-[#E8EBF0]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/[0.08] bg-[rgba(20,28,45,0.85)] backdrop-blur-xl">
                <DropdownMenuItem onClick={() => onRotateToken(node.id)} className="focus:bg-[rgba(8,10,15,0.45)] focus:text-[#E8EBF0]">
                  Rotate Token
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-[rgba(8,10,15,0.45)] focus:text-[#E8EBF0]">
                  <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
                    View Details
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-[#8B95A8]">
          <span className="rounded border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-1.5 py-0.5 font-mono uppercase">
            {node.platform || '—'}
          </span>
          <span className="font-mono">{getPrimaryIP(info)}</span>
          <span className="ml-auto">{formatRelativeTime(node.last_seen_at)}</span>
        </div>

        <div className="mt-5 flex items-center justify-center gap-5 sm:gap-6">
          <ResourceRing label="CPU" percent={getCpuPercent(info)} size={ringSize} subtitle={getCpuSubtitle(info)} />
          <ResourceRing label="MEM" percent={getMemoryPercent(info)} size={ringSize} subtitle={getMemorySubtitle(info)} />
          <ResourceRing label="Disk" percent={getDiskPercent(info)} size={ringSize} subtitle={getDiskSubtitle(info)} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8B95A8]">IP</p>
            <p className="truncate font-mono text-xs font-semibold text-[#E8EBF0]">{getPrimaryIP(info)}</p>
          </div>
          <div className="rounded-md border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8B95A8]">CPU</p>
            <p className="truncate font-mono text-xs font-semibold text-[#E8EBF0]">{getCpuSubtitle(info) ?? '—'}</p>
          </div>
          <div className="rounded-md border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8B95A8]">Uptime</p>
            <p className="truncate font-mono text-xs font-semibold text-[#E8EBF0]">{getUptime(info) ?? '—'}</p>
          </div>
          <div className="rounded-md border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#8B95A8]">Version</p>
            <p className="truncate font-mono text-xs font-semibold text-[#E8EBF0]">{info?.version != null ? String(info.version) : '—'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center pointer-events-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onInstallCommand(node.id)}
            className="flex-1 border-white/[0.08] bg-[rgba(8,10,15,0.45)] text-[#E8EBF0] hover:border-[#00F0FF] hover:bg-[rgba(0,240,255,0.10)] hover:text-[#00F0FF]"
          >
            <Eye className="mr-2 h-4 w-4" />
            Install Command
          </Button>
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReset(node.id)}
              className="flex-1 border-white/[0.08] bg-[rgba(8,10,15,0.45)] text-[#E8EBF0] hover:border-[#FFC107] hover:bg-[rgba(255,193,7,0.10)] hover:text-[#FFC107]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
