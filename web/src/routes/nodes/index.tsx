import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { api, getDefaultPanelURL } from '@/lib/api'
import { useNodes } from '@/hooks/useNodes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { InstallCommandDisplay } from '@/components/install-command-card'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

type Node = {
  id: string
  name: string
  status: 'pending' | 'online' | 'offline'
  platform?: string
  system_info?: Record<string, unknown>
  last_seen_at?: string
  created_at: string
}

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
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Run this command on the target server:</p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                  <code>{installCommand}</code>
                </pre>
                <CopyButton text={installCommand} className="w-full" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))
        ) : filteredNodes.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title="No nodes found"
              description={nodes.length === 0 ? 'Get started by creating your first node.' : 'Try adjusting your search or filter.'}
            />
          </div>
        ) : (
          filteredNodes.map((node) => (
            <Card key={node.id} data-testid="node-card" className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle
                    className="truncate text-base font-medium"
                    title={node.name}
                  >
                    {node.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {node.status === 'online' ? (
                        <DropdownMenuItem onClick={() => handleReset(node.id)}>
                          Reset
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleShowInstallCommand(node.id)}>
                          Install Command
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleShowInstallCommand(node.id)}>
                        Rotate Token
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
                          View Details
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <StatusBadge status={node.status} />
              </CardContent>
            </Card>
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
