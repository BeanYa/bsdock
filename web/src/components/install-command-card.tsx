import { useState } from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/copy-button'
import { GlassCard } from '@/components/glass-card'

interface InstallCommandDisplayProps {
  installCommand: string
  loading?: boolean
  onGenerate: () => void
}

export function InstallCommandDisplay({ installCommand, loading, onGenerate }: InstallCommandDisplayProps) {
  return (
    <div className="space-y-4">
      {!installCommand ? (
        <>
          <p className="text-sm text-[#8892A0]">
            Install command is not stored for security. Generate a new one to register or reset this node.
          </p>
          <Button
            onClick={onGenerate}
            disabled={loading}
            className="w-full bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90 sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {loading ? 'Generating...' : 'Generate Install Command'}
          </Button>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-md border border-white/[0.08] bg-[#050607] p-4 shadow-inner">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#00F0FF]" aria-hidden="true" />
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all pl-3 font-mono text-sm leading-relaxed text-[#E8EBF0]">
              <code>
                <span className="select-none text-[#39FF14]">$ </span>
                {installCommand}
              </code>
            </pre>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyButton
              text={installCommand}
              className="glass flex-1 text-[#E8EBF0] hover:border-[#00F0FF] hover:bg-[rgba(0,240,255,0.10)] hover:text-[#00F0FF]"
            />
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={loading}
              className="glass flex-1 text-[#E8EBF0] hover:border-[#00F0FF] hover:bg-[rgba(0,240,255,0.10)] hover:text-[#00F0FF]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {loading ? 'Generating...' : 'Regenerate'}
            </Button>
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
    <GlassCard>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-[#8892A0]">
          <span>Install Command</span>
          {props.installCommand && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy"
              onClick={handleCopy}
              className="h-7 w-7 border-white/[0.08] bg-[rgba(8,10,15,0.45)] px-2 text-[#E8EBF0] hover:border-[#00F0FF] hover:bg-[rgba(0,240,255,0.10)] hover:text-[#00F0FF]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InstallCommandDisplay {...props} />
      </CardContent>
    </GlassCard>
  )
}
