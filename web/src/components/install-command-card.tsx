import { useState } from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/glass-card'

interface InstallCommandDisplayProps {
  installCommand: string
  loading?: boolean
  onGenerate: () => void
}

export function InstallCommandDisplay({ installCommand, loading, onGenerate }: InstallCommandDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {!installCommand ? (
        <>
          <p className="text-sm text-muted-foreground">
            Install command is not stored for security. Generate a new one to register or reset this node.
          </p>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground opacity-100 hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            {loading ? 'Generating...' : 'Generate Install Command'}
          </button>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-[#030712] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="absolute left-0 top-0 h-full w-1 bg-primary" aria-hidden="true" />
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all pl-4 font-mono text-sm leading-relaxed text-[#E8EBF0]">
              <code>
                <span className="select-none text-[#39FF14]">$ </span>
                {installCommand}
              </code>
            </pre>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleCopy}
              className="command-surface inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.08] px-3 py-2 text-sm font-medium text-foreground opacity-100 hover:opacity-90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading}
              className="command-surface inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.08] px-3 py-2 text-sm font-medium text-foreground opacity-100 hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {loading ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface InstallCommandCardProps extends InstallCommandDisplayProps {}

export function InstallCommandCard(props: InstallCommandCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(props.installCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <GlassCard hover={false} className="command-surface">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span>Install Command</span>
          {props.installCommand && (
            <button
              type="button"
              aria-label="Copy"
              onClick={handleCopy}
              className="command-surface inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] text-foreground opacity-100 hover:opacity-90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InstallCommandDisplay {...props} />
      </CardContent>
    </GlassCard>
  )
}
