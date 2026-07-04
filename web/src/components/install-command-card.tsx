import { RotateCcw } from 'lucide-react'
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
          <p className="text-sm text-muted-foreground">
            Install command is not stored for security. Click the button below to generate a new one.
          </p>
          <Button onClick={onGenerate} disabled={loading} className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" />
            {loading ? 'Generating...' : 'Rotate Token / Generate Install Command'}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Run this command on the target server:</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
            <code>{installCommand}</code>
          </pre>
          <div className="flex items-center gap-2">
            <CopyButton text={installCommand} />
            <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading}>
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
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Install Command</CardTitle>
      </CardHeader>
      <CardContent>
        <InstallCommandDisplay {...props} />
      </CardContent>
    </Card>
  )
}
