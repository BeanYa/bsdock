import { useState } from 'react'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyButton } from '@/components/copy-button'

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
            className="w-full border-white/[0.08] bg-[rgba(8,10,15,0.45)] text-[#E8EBF0] hover:border-[#00F0FF] hover:bg-[rgba(0,240,255,0.10)] hover:text-[#00F0FF] sm:w-auto"
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
              className="flex-1 border-white/[0.08] bg-[rgba(8,10,15,0.45)] text-[#E8EBF0] hover:border-[#00F0FF] hover:bg-[rgba(0,240,255,0.10)] hover:text-[#00F0FF]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerate}
              disabled={loading}
              className="flex-1 border-white/[0.08] bg-[rgba(8,10,15,0.45)] text-[#E8EBF0] hover:border-[#00F0FF] hover:bg-[rgba(0,240,255,0.10)] hover:text-[#00F0FF]"
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
    <Card className="border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
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
    </Card>
  )
}
