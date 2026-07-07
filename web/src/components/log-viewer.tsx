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
        className="command-surface h-full overflow-auto rounded-xl border border-white/[0.08] bg-[rgba(6,8,13,0.92)] p-0"
      >
        {entries.length === 0 ? (
          <div className="flex h-full min-h-[24rem] flex-col items-center justify-center px-6 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8B95A8]">Log stream idle</p>
            <p className="mt-3 text-sm text-[#E8EBF0]">暂无日志</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#8B95A8]">
              切换日志源或等待新的运行事件，最新输出会持续追加在当前终端面板内。
            </p>
          </div>
        ) : (
          <div className="min-h-full">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[rgba(6,8,13,0.96)] px-4 py-3 backdrop-blur-xl">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8B95A8]">Live terminal</p>
                <p className="mt-1 text-sm font-medium text-[#E8EBF0]">BSDock command stream</p>
              </div>
              <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[#8B95A8]">
                {entries.length} lines
              </div>
            </div>
            <div className="space-y-1 px-4 py-4">
              {entries.map((entry, index) => <LogLine key={index} entry={entry} />)}
            </div>
          </div>
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
