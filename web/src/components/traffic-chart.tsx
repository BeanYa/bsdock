import { useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface TrafficHistoryPoint {
  sent: number
  received: number
  time: number
}

interface TrafficChartsProps {
  sent: number
  received: number
  updatedAt?: number
  maxPoints?: number
}

function useTrafficHistory(
  sent: number,
  received: number,
  updatedAt: number | undefined,
  maxPoints: number
): TrafficHistoryPoint[] {
  const lastRef = useRef<{ sent: number; received: number; time: number } | null>(null)
  const historyRef = useRef<TrafficHistoryPoint[]>([])

  const now = updatedAt ?? 0
  if (now !== 0 && lastRef.current !== null) {
    const dt = Math.max((now - lastRef.current.time) / 1000, 0.001)
    if (dt > 0.5) {
      const dSent = Math.max(0, sent - lastRef.current.sent)
      const dReceived = Math.max(0, received - lastRef.current.received)
      const point = { sent: dSent / dt, received: dReceived / dt, time: now }

      const currentLast = historyRef.current[historyRef.current.length - 1]
      if (!currentLast || currentLast.time !== point.time) {
        historyRef.current = [...historyRef.current, point]
        if (historyRef.current.length > maxPoints) {
          historyRef.current = historyRef.current.slice(historyRef.current.length - maxPoints)
        }
      }

      lastRef.current = { sent, received, time: now }
    }
  } else if (now !== 0 && lastRef.current === null) {
    lastRef.current = { sent, received, time: now }
  }

  return historyRef.current
}

function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec < 0) return '—'
  if (bytesPerSec === 0) return '0 B/s'
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytesPerSec) / Math.log(1024)))
  return `${(bytesPerSec / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

interface LineChartProps {
  data: number[]
  color?: string
  fillColor?: string
  height?: number
}

function formatAxisSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const rawIndex = Math.floor(Math.log(bytesPerSec) / Math.log(1024))
  const i = Math.max(0, Math.min(sizes.length - 1, rawIndex))
  const value = bytesPerSec / Math.pow(1024, i)
  const formatted = value >= 10 ? Math.round(value).toString() : value.toFixed(1)
  return `${formatted} ${sizes[i]}`
}

function LineChart({
  data,
  color = '#7DD3C0',
  fillColor = 'rgba(125, 211, 192, 0.15)',
  height = 144,
}: LineChartProps) {
  if (data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-[#8892A0]">
        Collecting data...
      </div>
    )
  }

  const axisWidth = 40
  const padding = { top: 8, right: 8, bottom: 20 }
  const width = 320
  const plotWidth = width - axisWidth - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const rawMax = Math.max(...data, 0)
  const rawMin = Math.min(...data, 0)
  const rawRange = rawMax - rawMin

  const yMin = 0
  const yMax = Math.max(rawMax * 1.1, rawRange * 1.1, 1)
  const yRange = yMax - yMin || 1

  const xFor = (i: number) => (i / (data.length - 1)) * plotWidth
  const yFor = (v: number) => padding.top + plotHeight - ((v - yMin) / yRange) * plotHeight

  const points = data.map((v, i) => `${xFor(i)},${yFor(v)}`)
  const areaPath =
    `M${points[0]} ` +
    points.slice(1).map((p) => `L${p}`).join(' ') +
    ` L${plotWidth},${padding.top + plotHeight} L0,${padding.top + plotHeight} Z`
  const linePath = `M${points[0]} ` + points.slice(1).map((p) => `L${p}`).join(' ')

  const gridLines = 4
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => yMin + (yRange * i) / gridLines)

  return (
    <div className="flex h-full w-full">
      <div className="relative shrink-0" style={{ width: axisWidth }}>
        {ticks.map((t, i) => {
          const y = yFor(t)
          return (
            <div
              key={i}
              className="absolute right-1 text-[11px] tabular-nums text-[#8892A0] sm:text-xs"
              style={{ top: y, transform: 'translateY(-50%)', lineHeight: 1 }}
            >
              {formatAxisSpeed(t)}
            </div>
          )
        })}
      </div>
      <div className="relative flex-1">
        <svg
          viewBox={`0 0 ${plotWidth} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id={`fill-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t, i) => {
            const y = yFor(t)
            return (
              <line
                key={i}
                x1={0}
                y1={y}
                x2={plotWidth}
                y2={y}
                stroke="#2A3546"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}

          <path d={areaPath} fill={fillColor} />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((v, i) => {
            const cx = xFor(i)
            const cy = yFor(v)
            const isMax = v === rawMax
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isMax ? 2.5 : 1.5}
                fill={isMax ? '#FFFFFF' : color}
                stroke={isMax ? color : 'none'}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export function TrafficCharts({ sent, received, updatedAt, maxPoints = 30 }: TrafficChartsProps) {
  const history = useTrafficHistory(sent, received, updatedAt, maxPoints)
  const sentSeries = history.map((p) => p.sent)
  const receivedSeries = history.map((p) => p.received)
  const combinedSeries = history.map((p) => p.sent + p.received)

  const currentSent = sentSeries[sentSeries.length - 1] ?? 0
  const currentReceived = receivedSeries[receivedSeries.length - 1] ?? 0
  const currentCombined = currentSent + currentReceived

  const cards = [
    {
      title: 'WebSocket Sent',
      value: formatSpeed(currentSent),
      data: sentSeries,
      color: '#7DD3C0',
      fillColor: 'rgba(125, 211, 192, 0.15)',
    },
    {
      title: 'WebSocket Received',
      value: formatSpeed(currentReceived),
      data: receivedSeries,
      color: '#C084FC',
      fillColor: 'rgba(192, 132, 252, 0.15)',
    },
    {
      title: 'Combined Traffic',
      value: formatSpeed(currentCombined),
      data: combinedSeries,
      color: '#FBBF24',
      fillColor: 'rgba(251, 191, 36, 0.15)',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#8892A0] sm:text-base">{card.title}</p>
                <p className="mt-1 font-mono text-xl font-semibold text-[#C5C6C7] sm:text-2xl">{card.value}</p>
              </div>
            </div>
            <div className="mt-3 h-36 w-full">
              <LineChart
                data={card.data}
                color={card.color}
                fillColor={card.fillColor}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
