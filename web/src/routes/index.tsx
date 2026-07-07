import { createFileRoute, Navigate } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'
import { usePanelStatus } from '@/hooks/usePanelStatus'
import { PanelHeroCard } from '@/components/panel-hero-card'
import { PanelProbeCard } from '@/components/panel-probe-card'
import { TrafficCharts } from '@/components/traffic-chart'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Server, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />
  }

  return <HomePage />
}

function HomePage() {
  const { status, loading, error, lastUpdatedAt } = usePanelStatus(5000)
  const reduceMotion = useReducedMotion()
  const sectionMotion = (delay: number) =>
    reduceMotion
      ? { initial: false, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay },
        }

  if (loading && !status) {
    return <HomeSkeleton />
  }

  if (error && !status) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed border-[#2A3546] bg-[#1F2833]/50 p-8 text-center">
        <h2 className="text-lg font-medium text-[#C5C6C7]">Failed to load panel status</h2>
        <p className="mt-1 text-sm text-[#8892A0]">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <motion.section
        {...sectionMotion(0.1)}
        className="grid grid-cols-1 gap-4 xl:grid-cols-12"
      >
        <div className="xl:col-span-8">
          <PanelHeroCard status={status} />
        </div>
        <div className="grid grid-cols-2 gap-3 xl:col-span-4">
          <StatCard
            title="Total Nodes"
            value={status?.nodes.total ?? '—'}
            description="Registered agents"
            icon={<Server className="h-4 w-4" />}
            status="online"
          />
          <StatCard
            title="Online"
            value={status?.nodes.online ?? '—'}
            description="Active agents"
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            status="online"
          />
          <StatCard
            title="Offline"
            value={status?.nodes.offline ?? '—'}
            description="Disconnected"
            icon={<XCircle className="h-4 w-4 text-rose-400" />}
            status="offline"
          />
          <StatCard
            title="Pending"
            value={status?.nodes.pending ?? '—'}
            description="Awaiting install"
            icon={<Clock className="h-4 w-4 text-amber-400" />}
            status="pending"
          />
        </div>
      </motion.section>

      <motion.section
        {...sectionMotion(0.2)}
        className="grid grid-cols-1 gap-4 xl:grid-cols-12"
      >
        <div className="xl:col-span-5">
          <PanelProbeCard status={status} />
        </div>
        <div className="xl:col-span-7">
          <TrafficCharts
            sent={status?.network.sent ?? 0}
            received={status?.network.received ?? 0}
            updatedAt={lastUpdatedAt}
          />
        </div>
      </motion.section>
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 xl:col-span-4">
          <Skeleton className="h-full min-h-[120px] w-full rounded-xl" />
          <Skeleton className="h-full min-h-[120px] w-full rounded-xl" />
          <Skeleton className="h-full min-h-[120px] w-full rounded-xl" />
          <Skeleton className="h-full min-h-[120px] w-full rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Skeleton className="h-[30rem] w-full rounded-xl xl:col-span-5" />
        <Skeleton className="h-[30rem] w-full rounded-xl xl:col-span-7" />
      </div>
    </div>
  )
}
