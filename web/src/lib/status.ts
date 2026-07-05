export type NodeStatus = 'online' | 'offline' | 'pending'

export const statusColorClasses: Record<
  NodeStatus,
  { bg: string; text: string }
> = {
  online: { bg: 'bg-[#39FF14]', text: 'text-[#39FF14]' },
  offline: { bg: 'bg-[#FFC107]', text: 'text-[#FFC107]' },
  pending: { bg: 'bg-[#FF4D4D]', text: 'text-[#FF4D4D]' },
}

export function getStatusColorClasses(status: string) {
  return statusColorClasses[status as NodeStatus] ?? statusColorClasses.pending
}
