interface ResourceRingProps {
  label: string
  percent: number | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  subtitle?: string
  color?: string
}

const SIZE_MAP = {
  sm: { svg: 'w-14 h-14', percent: 'text-xs', label: 'text-[10px]', stroke: 7, box: 56, radius: 22 },
  md: { svg: 'w-20 h-20', percent: 'text-base', label: 'text-[10px]', stroke: 9, box: 72, radius: 29 },
  lg: { svg: 'w-36 h-36 sm:w-44 sm:h-44', percent: 'text-3xl', label: 'text-base', stroke: 13, box: 144, radius: 59 },
  xl: { svg: 'w-44 h-44 sm:w-56 sm:h-56', percent: 'text-4xl', label: 'text-lg', stroke: 15, box: 176, radius: 73 },
}

const LABEL_COLORS: Record<string, string> = {
  cpu: '#7DD3C0',
  mem: '#C084FC',
  memory: '#C084FC',
  disk: '#FBBF24',
}

export function ResourceRing({ label, percent, size = 'md', subtitle, color: colorProp }: ResourceRingProps) {
  const classes = SIZE_MAP[size]
  const circumference = 2 * Math.PI * classes.radius
  const safePercent = percent != null && Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null
  const offset = safePercent != null ? circumference - (safePercent / 100) * circumference : circumference

  const defaultColor = LABEL_COLORS[label.toLowerCase()]
  const usageColor = safePercent == null
    ? '#8892A0'
    : safePercent >= 90
    ? '#FF4D4D'
    : safePercent >= 70
    ? '#FFC107'
    : defaultColor ?? '#39FF14'
  const color = colorProp ?? usageColor

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg
          className={`${classes.svg} -rotate-90 transform drop-shadow-[0_0_6px_${color}40]`}
          viewBox={`0 0 ${classes.box} ${classes.box}`}
          role="img"
          aria-label={`${label} ${safePercent != null ? `${safePercent}%` : 'unknown'}`}
        >
          <circle
            cx={classes.box / 2}
            cy={classes.box / 2}
            r={classes.radius}
            fill="none"
            stroke="#2A3546"
            strokeWidth={classes.stroke}
          />
          <circle
            cx={classes.box / 2}
            cy={classes.box / 2}
            r={classes.radius}
            fill="none"
            stroke={color}
            strokeWidth={classes.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono font-bold leading-none text-[#C5C6C7] ${classes.percent}`}>
          {safePercent != null ? `${Math.round(safePercent)}%` : '—'}
        </span>
      </div>
      <div className="text-center">
        <div className={`font-mono font-semibold uppercase tracking-wider text-[#8892A0] ${classes.label}`}>{label}</div>
        {subtitle != null && subtitle !== '' && (
          <div className="mt-1 text-xs font-mono text-[#8892A0]/70 sm:text-sm">{subtitle}</div>
        )}
      </div>
    </div>
  )
}
