import { Server } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  children?: React.ReactNode
}

export function EmptyState({
  title = 'No items',
  description = 'Get started by creating a new item.',
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <div className="rounded-full bg-muted p-3">
        <Server className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
