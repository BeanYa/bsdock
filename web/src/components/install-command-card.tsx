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
            className="w-full bg-[#00F0FF] text-[#0B0C10] hover:bg-[#00F0FF]/90 sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {loading ? 'Generating...' : 'Generate Install Command'}
          </Button>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-md border border-[#2A3546] bg-[#0B0C10] p-4">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#00F0FF]" aria-hidden="true" />
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all pl-3 font-mono text-sm leading-relaxed text-[#C5C6C7]">
              <code>
                <span className="select-none text-[#39FF14]">$ </span>
                {installCommand}
              </code>
            </pre>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyButton
              text={installCommand}
              className="border-[#2A3546] bg-[#1F2833] text-[#C5C6C7] hover:bg-[#2A3546] hover:text-[#C5C6C7]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerate}
              disabled={loading}
              className="border-[#2A3546] bg-[#1F2833] text-[#C5C6C7] hover:bg-[#2A3546] hover:text-[#C5C6C7]"
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
    <Card className="border-[#2A3546] bg-[#1F2833]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-[#8892A0]">
          <span>Install Command</span>
          {props.installCommand && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy"
              onClick={handleCopy}
              className="h-7 w-7 border-[#2A3546] bg-[#0B0C10] px-2 text-[#C5C6C7] hover:bg-[#2A3546]"
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
