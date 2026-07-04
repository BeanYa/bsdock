import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { useNodes } from '@/hooks/useNodes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

function NodesPage() {
  const { nodes, reload } = useNodes()
  const [name, setName] = useState('')
  const [panelURL, setPanelURL] = useState(window.location.origin)
  const [platform, setPlatform] = useState('linux')
  const [installCommand, setInstallCommand] = useState('')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const data = await api.createNode(name, panelURL, platform)
      setInstallCommand(data.install_command)
      setName('')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
    }
  }

  const copyCommand = () => {
    navigator.clipboard.writeText(installCommand)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nodes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setInstallCommand(''); setOpen(true) }}>New Node</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Node</DialogTitle>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!installCommand ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="node-name">Name</Label>
                  <Input id="node-name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panel-url">Panel URL</Label>
                  <Input id="panel-url" placeholder="Panel URL" value={panelURL} onChange={(e) => setPanelURL(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="linux">Linux</option>
                    <option value="windows">Windows</option>
                  </select>
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Run this command on the target server:</p>
                <pre className="rounded bg-muted p-3 text-xs overflow-auto">{installCommand}</pre>
                <Button onClick={copyCommand} className="w-full">Copy</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(nodes as Node[]).map((node) => (
                <TableRow key={node.id}>
                  <TableCell>{node.name}</TableCell>
                  <TableCell><StatusBadge status={node.status} /></TableCell>
                  <TableCell>{node.last_seen_at ? new Date(node.last_seen_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>{new Date(node.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'online' ? 'default' : status === 'offline' ? 'destructive' : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}
