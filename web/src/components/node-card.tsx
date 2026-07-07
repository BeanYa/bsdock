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
  const primaryIP = getPrimaryIP(info)
  const lastSeen = formatRelativeTime(node.last_seen_at)
  const uptime = getUptime(info) ?? '—'
  const version = info?.version != null ? String(info.version) : '—'

  return (
    <GlassCard
      data-testid="node-card"
      hover={false}
      className="command-surface group flex min-h-[27rem] flex-col rounded-xl border-white/[0.08] p-0"
    >
      <div
        className={cn(
          'absolute left-0 right-0 top-0 h-1',
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

      <div className="relative z-10 flex h-full flex-col pointer-events-none px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B95A8]">
                {node.platform || '—'}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8B95A8]">
                Fleet Node
              </span>
            </div>
            <h3
              className="truncate text-lg font-semibold tracking-tight text-[#E8EBF0]"
              title={node.name}
            >
              {node.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B95A8]">
              <span className="font-mono text-[#E8EBF0]">{primaryIP}</span>
              <span className="text-[#52627A]">/</span>
              <span>Last seen {lastSeen}</span>
            </div>
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

        <div className="mt-5 flex items-center justify-center gap-5 rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.32)] px-3 py-4 sm:gap-6">
          <ResourceRing label="CPU" percent={getCpuPercent(info)} size={ringSize} subtitle={getCpuSubtitle(info)} />
          <ResourceRing label="MEM" percent={getMemoryPercent(info)} size={ringSize} subtitle={getMemorySubtitle(info)} />
          <ResourceRing label="Disk" percent={getDiskPercent(info)} size={ringSize} subtitle={getDiskSubtitle(info)} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#8B95A8]">Uptime</p>
            <p className="mt-1 truncate font-mono text-sm font-semibold text-[#E8EBF0]">{uptime}</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#8B95A8]">Version</p>
            <p className="mt-1 truncate font-mono text-sm font-semibold text-[#E8EBF0]">{version}</p>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-4 pointer-events-auto sm:flex-row sm:items-center">
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
