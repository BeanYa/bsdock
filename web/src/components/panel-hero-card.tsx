import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Activity, RefreshCw, ArrowUpRight, Loader2 } from 'lucide-react'
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
    <Card className="relative overflow-hidden border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
      <CardContent className="flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              B
            </div>
            <div>
              <p className="text-sm font-medium text-[#8B95A8]">Hello Admin</p>
              <h2 className="text-xl font-semibold tracking-tight text-[#E8EBF0]">BSDock</h2>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          >
            <Activity className="mr-1 h-3 w-3" />
            {healthy ? 'System Operational' : 'Degraded'}
          </Badge>
        </div>

        <div className="mt-6 space-y-1">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#E8EBF0] sm:text-4xl">
            Your control plane, live.
            <br />
            Currently routing through BSDock.
          </h1>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#8B95A8] sm:text-base">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Panel v{status?.version ?? '—'}
          </span>
          <span className="hidden sm:inline">•</span>
          <span>Uptime {formatUptime(status?.uptime_seconds)}</span>
          <span className="hidden sm:inline">•</span>
          <span className="font-mono">{status?.go_version ?? '—'}</span>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/[0.08] bg-[rgba(8,10,15,0.45)] text-[#E8EBF0] hover:bg-white/[0.08] hover:text-[#E8EBF0]"
            onClick={() => setUpdateDialogOpen(true)}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Update
          </Button>
          <a
            href="/nodes"
            className="inline-flex h-9 items-center justify-center rounded-md border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-3 text-sm font-medium text-[#E8EBF0] transition-colors hover:bg-white/[0.08] hover:text-[#E8EBF0]"
          >
            Usage & Counts
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="border-[#2A3546] bg-[#1F2833] text-[#E8EBF0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Panel</DialogTitle>
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
              <Button
                variant="outline"
                size="sm"
                className="border-white/[0.08] bg-[rgba(8,10,15,0.45)] text-[#E8EBF0] hover:bg-white/[0.08] hover:text-[#E8EBF0]"
                onClick={() => setUpdateDialogOpen(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Confirm Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
