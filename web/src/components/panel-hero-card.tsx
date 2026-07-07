import { useState } from 'react'
import { CardContent } from '@/components/ui/card'
import { GlassCard } from '@/components/glass-card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Activity, ArrowRight, ArrowUpRight, Binary, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import type { PanelStatus } from '@/lib/api'

interface PanelHeroCardProps {
  status: PanelStatus | null
}

function formatUptime(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${mins}m`)
  return parts.join(' ')
}

export function PanelHeroCard({ status }: PanelHeroCardProps) {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()
  const healthy = (status?.nodes.online ?? 0) > 0 || (status?.nodes.total ?? 0) === 0
  const shellButtonClassName =
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-[#E8EBF0] transition-transform motion-reduce:transition-none hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:pointer-events-none disabled:opacity-50'
  const statusLabel = healthy ? 'Control plane nominal' : 'Control plane degraded'

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      // Placeholder: replace with real panel update API call.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast({ title: 'Panel update initiated' })
      setUpdateDialogOpen(false)
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update panel',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <GlassCard hover={false} className="command-surface command-grid">
      <CardContent className="relative flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
              <Binary className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8B95A8]">Command Center</p>
              <h2 className="text-lg font-semibold tracking-tight text-[#E8EBF0]">BSDock Control Plane</h2>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 border px-3 py-1.5 text-xs font-medium',
              healthy
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            )}
          >
            <Activity className="h-3 w-3" />
            {statusLabel}
          </Badge>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.32em] text-primary/80">Home Control Plane</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#E8EBF0] sm:text-4xl xl:text-[2.75rem]">
            {healthy ? 'Operations are steady and ready to route.' : 'Attention needed across the control plane.'}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[#8B95A8] sm:text-base">
            Review live panel health, runtime posture, and traffic throughput from one command surface before diving into node operations.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8B95A8]">Panel</p>
            <p className="mt-2 font-mono text-sm font-semibold text-[#E8EBF0]">v{status?.version ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8B95A8]">Uptime</p>
            <p className="mt-2 font-mono text-sm font-semibold text-[#E8EBF0]">{formatUptime(status?.uptime_seconds)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8B95A8]">Runtime</p>
            <p className="mt-2 font-mono text-sm font-semibold text-[#E8EBF0]">{status?.go_version ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8B95A8]">Platform</p>
            <p className="mt-2 font-mono text-sm font-semibold uppercase text-[#E8EBF0]">
              {status?.platform ?? '—'} / {status?.arch ?? '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className={shellButtonClassName} onClick={() => setUpdateDialogOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Update
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <a
            href="/nodes"
            className={shellButtonClassName}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Node registry
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="glass text-[#E8EBF0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#E8EBF0]">Update Panel</DialogTitle>
            <DialogDescription className="text-[#8B95A8]">
              Are you sure you want to update the panel to the latest version? This will restart the
              control plane and may briefly interrupt service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-[#2A3546] bg-[#0B0C10]/60 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8B95A8]">Current version</span>
                <span className="font-mono text-[#E8EBF0]">{status?.version ?? '—'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={shellButtonClassName}
                onClick={() => setUpdateDialogOpen(false)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(
                  shellButtonClassName,
                  'border-primary/30 bg-primary text-primary-foreground'
                )}
                onClick={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Confirm Update
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GlassCard>
  )
}
