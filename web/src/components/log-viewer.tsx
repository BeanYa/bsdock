import { useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { LogLine } from './log-line'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LogEntry } from '@/hooks/useLogs'

interface LogViewerProps {
  entries: LogEntry[]
}

const BOTTOM_THRESHOLD = 24

export function LogViewer({ entries }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const lastEntryCountRef = useRef(entries.length)

  const scrollToBottom = () => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    if (entries.length === lastEntryCountRef.current) return
    lastEntryCountRef.current = entries.length
    if (!isLocked) {
      const el = containerRef.current
      if (el) {
        setShowScrollButton(el.scrollTop + el.clientHeight < el.scrollHeight - BOTTOM_THRESHOLD)
      }
      return
    }
    scrollToBottom()
  }, [entries, isLocked])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_THRESHOLD
    setIsLocked(nearBottom)
    setShowScrollButton(!nearBottom)
  }

  const handleScrollToBottom = () => {
    scrollToBottom()
    setIsLocked(true)
    setShowScrollButton(false)
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="glass h-full overflow-auto rounded-xl p-4"
      >
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8B95A8]">
            暂无日志
          </div>
        ) : (
          entries.map((entry, index) => <LogLine key={index} entry={entry} />)
        )}
        <div aria-hidden="true" />
      </div>
      <Button
        size="sm"
        onClick={handleScrollToBottom}
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 gap-1 bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90',
          !showScrollButton && 'hidden'
        )}
      >
        <ArrowDown className="h-3 w-3" />
        回到底部
      </Button>
    </div>
  )
}
