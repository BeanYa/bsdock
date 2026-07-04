import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nodes/')({
  component: NodesIndexPage,
})

function NodesIndexPage() {
  return <div className="text-muted-foreground">Nodes list will appear here.</div>
}
