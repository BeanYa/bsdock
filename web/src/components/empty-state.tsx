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
    <div className="glass flex flex-col items-center justify-center rounded-xl p-8 text-center">
      <div className="rounded-full bg-[rgba(8,10,15,0.45)] p-3">
        <Server className="h-6 w-6 text-[#8B95A8]" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-[#E8EBF0]">{title}</h3>
      <p className="mt-1 text-sm text-[#8B95A8]">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
