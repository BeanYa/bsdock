import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
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

      <div className="glass flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B95A8]" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-white/[0.08] bg-[rgba(8,10,15,0.45)] pl-9 text-[#E8EBF0] placeholder:text-[#8B95A8] focus-visible:ring-[#00F0FF]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full border-white/[0.08] bg-[rgba(8,10,15,0.45)] text-[#E8EBF0] focus:ring-[#00F0FF] sm:w-[180px]">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="glass relative flex flex-col p-4"
            >
              <div className="absolute left-0 right-0 top-0 h-[3px] bg-[#8B95A8]/50" aria-hidden="true" />
              <Skeleton className="h-5 w-3/4 bg-[rgba(8,10,15,0.45)]" />
              <Skeleton className="mt-3 h-4 w-16 bg-[rgba(8,10,15,0.45)]" />
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
