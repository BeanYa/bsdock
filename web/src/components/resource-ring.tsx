interface ResourceRingProps {
  label: string
  percent: number | null
  size?: 'sm' | 'md'
}

const SIZE_MAP = {
  sm: { svg: 'w-12 h-12', text: 'text-xs' },
  md: { svg: 'w-14 h-14', text: 'text-sm' },
}

export function ResourceRing({ label, percent, size = 'md' }: ResourceRingProps) {
  const classes = SIZE_MAP[size]
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const safePercent = percent != null && Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null
  const offset = safePercent != null ? circumference - (safePercent / 100) * circumference : circumference
  const color = safePercent == null
    ? '#8892A0'
    : safePercent >= 90
    ? '#FF4D4D'
    : safePercent >= 70
    ? '#FFC107'
    : '#39FF14'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg
          className={`${classes.svg} -rotate-90 transform`}
          viewBox="0 0 56 56"
          role="img"
          aria-label={`${label} ${safePercent != null ? `${safePercent}%` : 'unknown'}`}
        >
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="#2A3546"
            strokeWidth="6"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono font-semibold leading-none text-[#C5C6C7] ${classes.text}`}>
          {safePercent != null ? `${Math.round(safePercent)}%` : '—'}
        </span>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8892A0]">{label}</span>
    </div>
  )
}
