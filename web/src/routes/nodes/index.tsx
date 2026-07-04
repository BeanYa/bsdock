import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { useNodes } from '@/hooks/useNodes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/nodes/')({
  component: NodesPage,
})

type Node = {
  id: string
  name: string
  status: 'pending' | 'online' | 'offline'
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
  const defaultPanelURL =
    window.location.origin === 'http://localhost:5173'
      ? 'http://localhost:8080'
      : window.location.origin
  const [panelURL, setPanelURL] = useState(defaultPanelURL)
  const [platform, setPlatform] = useState('linux')
  const [installCommand, setInstallCommand] = useState('')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

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

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last Seen</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredNodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="border-0 p-0">
                      <EmptyState
                        title="No nodes found"
                        description={nodes.length === 0 ? 'Get started by creating your first node.' : 'Try adjusting your search or filter.'}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNodes.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell className="font-medium">{node.name}</TableCell>
                      <TableCell><StatusBadge status={node.status} /></TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {node.last_seen_at ? new Date(node.last_seen_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {new Date(node.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
