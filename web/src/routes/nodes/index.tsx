import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ListFilter, Plus, Search } from 'lucide-react'
import { api, getDefaultPanelURL } from '@/lib/api'
import { useNodes } from '@/hooks/useNodes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { InstallCommandDisplay } from '@/components/install-command-card'
import { PageHeader } from '@/components/page-header'
import { NodeCard, type Node } from '@/components/node-card'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'motion/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/nodes/')({
  component: NodesPage,
})

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'pending', label: 'Pending' },
]

function NodesPage() {
  const { nodes, loading, reload } = useNodes()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [panelURL, setPanelURL] = useState(getDefaultPanelURL())
  const [platform, setPlatform] = useState('linux')
  const [installCommand, setInstallCommand] = useState('')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogCommand, setDialogCommand] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [dialogNodeId, setDialogNodeId] = useState<string | null>(null)
  const [createdNodeId, setCreatedNodeId] = useState<string | null>(null)

  const filteredNodes = useMemo(() => {
    return (nodes as Node[]).filter((node) => {
      const matchesSearch = node.name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || node.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [nodes, search, statusFilter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = await api.createNode(name, panelURL, platform)
      setInstallCommand(data.install_command)
      setCreatedNodeId(data.id)
      setName('')
      toast({ title: '节点创建成功' })
      reload()
    } catch (err) {
      toast({
        title: '创建失败',
        description: err instanceof Error ? err.message : '无法创建节点',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      setInstallCommand('')
      setName('')
      setCreatedNodeId(null)
    }
  }

  const handleShowInstallCommand = async (nodeId: string) => {
    setDialogLoading(true)
    setDialogOpen(true)
    setDialogCommand('')
    setDialogNodeId(nodeId)
    try {
      const data = await api.rotateToken(nodeId)
      setDialogCommand(data.install_command)
    } catch (err) {
      setDialogOpen(false)
      setDialogNodeId(null)
      toast({
        title: '生成安装命令失败',
        description: err instanceof Error ? err.message : '无法轮换 Token',
        variant: 'destructive',
      })
    } finally {
      setDialogLoading(false)
    }
  }

  const handleReset = async (nodeId: string) => {
    setDialogLoading(true)
    setDialogOpen(true)
    setDialogCommand('')
    setDialogNodeId(nodeId)
    try {
      const data = await api.resetNode(nodeId)
      setDialogCommand(data.install_command)
      toast({ title: '节点已重置，请使用新安装命令重新注册' })
    } catch (err) {
      setDialogOpen(false)
      setDialogNodeId(null)
      toast({
        title: 'Reset 失败',
        description: err instanceof Error ? err.message : '无法重置节点',
        variant: 'destructive',
      })
    } finally {
      setDialogLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Nodes" description="管理和监控所有已注册的节点">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Node
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Node</DialogTitle>
            </DialogHeader>
            {!installCommand ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="node-name">Name</Label>
                  <Input
                    id="node-name"
                    placeholder="e.g. production-01"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panel-url">Panel URL</Label>
                  <Input
                    id="panel-url"
                    placeholder="Panel URL"
                    value={panelURL}
                    onChange={(e) => setPanelURL(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger id="platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="windows">Windows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </Button>
              </form>
            ) : (
              <InstallCommandDisplay
                installCommand={installCommand}
                loading={submitting}
                onGenerate={async () => {
                  if (!createdNodeId) return
                  setSubmitting(true)
                  try {
                    const data = await api.rotateToken(createdNodeId)
                    setInstallCommand(data.install_command)
                  } catch (err) {
                    toast({
                      title: '生成安装命令失败',
                      description: err instanceof Error ? err.message : '无法轮换 Token',
                      variant: 'destructive',
                    })
                  } finally {
                    setSubmitting(false)
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </PageHeader>

      <section className="command-surface rounded-xl border border-white/[0.08] p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[rgba(255,255,255,0.02)]">
              <Search className="h-4 w-4 text-[#8B95A8]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B95A8]">
                Fleet Search
              </p>
              <Input
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-auto border-0 bg-transparent px-0 py-0 text-sm text-[#E8EBF0] shadow-none placeholder:text-[#8B95A8] focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-3 py-2.5">
              <ListFilter className="h-4 w-4 text-[#8B95A8]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-auto w-full border-0 bg-transparent px-0 py-0 text-sm text-[#E8EBF0] shadow-none focus:ring-0 sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-[rgba(20,28,45,0.85)] backdrop-blur-xl">
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="focus:bg-[rgba(8,10,15,0.45)] focus:text-[#E8EBF0]">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-3 py-2 text-xs text-[#8B95A8]">
              <span className="font-mono text-sm font-semibold text-[#E8EBF0]">{filteredNodes.length}</span>{' '}
              of {nodes.length} nodes
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="command-surface relative flex min-h-[27rem] flex-col rounded-xl border border-white/[0.08] p-0"
            >
              <div className="absolute left-0 right-0 top-0 h-1 bg-[#8B95A8]/50" aria-hidden="true" />
              <div className="flex h-full flex-col px-4 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-7 w-20 rounded-full bg-[rgba(8,10,15,0.45)]" />
                    <Skeleton className="h-6 w-3/4 bg-[rgba(8,10,15,0.45)]" />
                    <Skeleton className="h-4 w-2/3 bg-[rgba(8,10,15,0.45)]" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full bg-[rgba(8,10,15,0.45)]" />
                </div>
                <div className="mt-5 rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.32)] px-3 py-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-20 w-full rounded-full bg-[rgba(8,10,15,0.45)]" />
                    <Skeleton className="h-20 w-full rounded-full bg-[rgba(8,10,15,0.45)]" />
                    <Skeleton className="h-20 w-full rounded-full bg-[rgba(8,10,15,0.45)]" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 w-full rounded-xl bg-[rgba(8,10,15,0.45)]" />
                  <Skeleton className="h-16 w-full rounded-xl bg-[rgba(8,10,15,0.45)]" />
                </div>
                <div className="mt-auto flex gap-2 pt-4">
                  <Skeleton className="h-9 flex-1 rounded-md bg-[rgba(8,10,15,0.45)]" />
                  <Skeleton className="h-9 flex-1 rounded-md bg-[rgba(8,10,15,0.45)]" />
                </div>
              </div>
            </div>
          ))
        ) : filteredNodes.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No nodes found"
              description={nodes.length === 0 ? 'Get started by creating your first node.' : 'Try adjusting your search or filter.'}
            />
          </div>
        ) : (
          filteredNodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <NodeCard
                node={node as Node}
                onInstallCommand={handleShowInstallCommand}
                onReset={handleReset}
                onRotateToken={handleShowInstallCommand}
              />
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(value) => {
        setDialogOpen(value)
        if (!value) setDialogNodeId(null)
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Install Command</DialogTitle>
          </DialogHeader>
          <InstallCommandDisplay
            installCommand={dialogCommand}
            loading={dialogLoading}
            onGenerate={() => {
              if (dialogNodeId) handleShowInstallCommand(dialogNodeId)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
