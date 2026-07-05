import { MoreHorizontal } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/status-badge'
import { cn } from '@/lib/utils'

export type NodeStatus = 'online' | 'offline' | 'pending'

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

const statusColorClasses: Record<NodeStatus, string> = {
  online: 'bg-[#39FF14] text-[#39FF14]',
  offline: 'bg-[#FFC107] text-[#FFC107]',
  pending: 'bg-[#FF4D4D] text-[#FF4D4D]',
}

function formatRelativeTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getPrimaryIP(info?: Record<string, unknown>): string {
  const ips = info?.ips
  if (Array.isArray(ips) && ips.length > 0) return String(ips[0])
  return '—'
}

function getResourceSnapshot(info?: Record<string, unknown>): string | null {
  const cpu = info?.cpu_percent
  const total = Number(info?.memory_total ?? NaN)
  const used = Number(info?.memory_used ?? NaN)
  const mem = Number.isFinite(total) && total > 0 && Number.isFinite(used)
    ? Math.round((used / total) * 100)
    : null
  const parts: string[] = []
  if (typeof cpu === 'number') parts.push(`CPU ${cpu.toFixed(0)}%`)
  if (typeof mem === 'number') parts.push(`MEM ${mem}%`)
  return parts.length > 0 ? parts.join('  ') : null
}

export function NodeCard({ node, onInstallCommand, onReset, onRotateToken }: NodeCardProps) {
  const snapshot = getResourceSnapshot(node.system_info)

  return (
    <Card
      data-testid="node-card"
      className={cn(
        'group relative flex flex-col overflow-hidden border-[#2A3546] bg-[#1F2833] p-4 transition-colors hover:bg-[#2A3546]'
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 group-hover:motion-safe:animate-status-pulse',
          statusColorClasses[node.status]
        )}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-2 pl-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-base font-semibold tracking-tight text-[#C5C6C7]"
            title={node.name}
          >
            {node.name}
          </h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 shrink-0 text-[#8892A0] hover:bg-[#2A3546] hover:text-[#C5C6C7]">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-[#2A3546] bg-[#1F2833]">
            {node.status === 'online' ? (
              <DropdownMenuItem onClick={() => onReset(node.id)} className="focus:bg-[#2A3546] focus:text-[#C5C6C7]">
                Reset
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onInstallCommand(node.id)} className="focus:bg-[#2A3546] focus:text-[#C5C6C7]">
                Install Command
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRotateToken(node.id)} className="focus:bg-[#2A3546] focus:text-[#C5C6C7]">
              Rotate Token
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:bg-[#2A3546] focus:text-[#C5C6C7]">
              <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
                View Details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center justify-between pl-3">
        <StatusBadge status={node.status} />
        <span className="text-xs text-[#8892A0]">{formatRelativeTime(node.last_seen_at)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-3 text-xs text-[#8892A0]">
        <span className="rounded border border-[#2A3546] bg-[#0B0C10] px-1.5 py-0.5 font-mono uppercase">
          {node.platform?.toUpperCase() || '—'}
        </span>
        <span className="font-mono">{getPrimaryIP(node.system_info)}</span>
        {snapshot && <span className="ml-auto font-mono text-[#C5C6C7]">{snapshot}</span>}
      </div>
    </Card>
  )
}
