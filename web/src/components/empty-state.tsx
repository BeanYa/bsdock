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
    <div className="command-surface flex flex-col items-center justify-center rounded-xl border border-white/[0.08] px-6 py-10 text-center">
      <div className="rounded-full border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <Server className="h-6 w-6 text-[#8B95A8]" />
      </div>
      <h3 className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#E8EBF0]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[#8B95A8]">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
