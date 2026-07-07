# Console Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign BSDock's node cards and install-command card around a mission-control console aesthetic with clearer information hierarchy and a signature status light bar.

**Architecture:** Keep the existing React + TanStack Router + shadcn/ui component structure; update the Tailwind CSS variable layer and rebuild three card surfaces in place. Introduce small, focused presentational components for reusable card primitives.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 3.4, shadcn/ui, Vitest + Testing Library, lucide-react, next-themes.

## Global Constraints

- All colors derive from the console token system in the design spec.
- `Maple Mono CN` remains the only font family.
- Reduced-motion preference disables the status-bar pulse.
- All status indicators include text equivalents (no color-only communication).
- New components live under `web/src/components/`.
- Tests live next to components (`*.test.tsx`) following the existing convention.

---

## File Map

| File | Responsibility |
|---|---|
| `web/src/index.css` | Console color tokens for `:root` and `.dark`; global body font. |
| `web/src/main.tsx` | Theme provider config (force dark console theme). |
| `web/src/components/status-badge.tsx` | Reusable status badge with signal colors. |
| `web/src/components/node-card.tsx` | New node list card with status light bar and metadata. |
| `web/src/components/node-card.test.tsx` | Tests for node-card rendering and status colors. |
| `web/src/routes/nodes/index.tsx` | Use `NodeCard` and update filter/search layout styling. |
| `web/src/components/info-card.tsx` | Reusable label/value card for detail hardware/network data. |
| `web/src/components/resource-card.tsx` | Label/value card with a usage ratio bar. |
| `web/src/routes/nodes/$nodeId.tsx` | Reorganize detail page into sections using new cards and a status banner. |
| `web/src/components/install-command-card.tsx` | Terminal-session install command card. |
| `web/src/components/install-command-card.test.tsx` | Tests for command display and actions. |

---

## Task 1: Global Console Theme

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/src/main.tsx`
- Test: `web/src/routes/nodes/index.test.tsx` (create if missing, otherwise run existing)

**Interfaces:**
- Consumes: none
- Produces: CSS custom properties for `--background`, `--card`, `--primary`, etc., all in the console palette.

- [ ] **Step 1: Update CSS variables to console palette**

Open `web/src/index.css` and replace the `:root` and `.dark` blocks with the console tokens. Both blocks should use the same dark values so system theme changes do not flash a light UI.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 18% 6%;          /* #0B0C10 */
    --foreground: 220 9% 78%;          /* #C5C6C7 */
    --card: 214 17% 16%;               /* #1F2833 */
    --card-foreground: 220 9% 78%;     /* #C5C6C7 */
    --popover: 214 17% 16%;            /* #1F2833 */
    --popover-foreground: 220 9% 78%;  /* #C5C6C7 */
    --primary: 186 100% 50%;           /* #00F0FF */
    --primary-foreground: 220 18% 6%;  /* #0B0C10 */
    --secondary: 214 17% 22%;          /* #2A3546 */
    --secondary-foreground: 220 9% 78%; /* #C5C6C7 */
    --muted: 214 17% 22%;              /* #2A3546 */
    --muted-foreground: 214 13% 58%;   /* #8892A0 */
    --accent: 214 17% 22%;             /* #2A3546 */
    --accent-foreground: 220 9% 78%;   /* #C5C6C7 */
    --destructive: 0 100% 65%;         /* #FF4D4D */
    --destructive-foreground: 0 0% 98%;
    --border: 214 17% 22%;             /* #2A3546 */
    --input: 214 17% 22%;              /* #2A3546 */
    --ring: 186 100% 50%;              /* #00F0FF */
    --radius: 0.625rem;
  }

  .dark {
    --background: 220 18% 6%;
    --foreground: 220 9% 78%;
    --card: 214 17% 16%;
    --card-foreground: 220 9% 78%;
    --popover: 214 17% 16%;
    --popover-foreground: 220 9% 78%;
    --primary: 186 100% 50%;
    --primary-foreground: 220 18% 6%;
    --secondary: 214 17% 22%;
    --secondary-foreground: 220 9% 78%;
    --muted: 214 17% 22%;
    --muted-foreground: 214 13% 58%;
    --accent: 214 17% 22%;
    --accent-foreground: 220 9% 78%;
    --destructive: 0 100% 65%;
    --destructive-foreground: 0 0% 98%;
    --border: 214 17% 22%;
    --input: 214 17% 22%;
    --ring: 186 100% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Maple Mono CN', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
}

@layer utilities {
  @keyframes status-pulse {
    0%, 100% {
      opacity: 1;
      box-shadow: 0 0 0 0 currentColor;
    }
    50% {
      opacity: 0.85;
      box-shadow: 0 0 12px 2px currentColor;
    }
  }

  .animate-status-pulse {
    animation: status-pulse 1.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-status-pulse {
      animation: none;
    }
  }
}
```

- [ ] **Step 2: Force dark console theme in ThemeProvider**

Open `web/src/main.tsx` and update the provider to prevent light-mode flash.

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
```

- [ ] **Step 3: Verify theme renders**

Run the dev server and open the nodes page in a browser.

Run: `cd web && bun run dev`
Expected: Background is near-black (`#0B0C10`), cards are dark panel (`#1F2833`), buttons show cyan focus ring on keyboard focus.

- [ ] **Step 4: Commit**

```bash
git add web/src/index.css web/src/main.tsx
git commit -m "feat(web): apply console theme tokens and force dark mode"
```

---

## Task 2: Node List Card

**Files:**
- Create: `web/src/components/node-card.tsx`
- Create: `web/src/components/node-card.test.tsx`
- Modify: `web/src/components/status-badge.tsx`
- Modify: `web/src/routes/nodes/index.tsx`

**Interfaces:**
- Consumes: `StatusBadge` from Task 1 styling, `Node` type inline.
- Produces: `NodeCard` component with props `{ node: Node; onInstallCommand: (id) => void; onReset: (id) => void; onRotateToken: (id) => void; }`.

- [ ] **Step 1: Update status-badge.tsx for signal colors**

Open `web/src/components/status-badge.tsx` and replace with console signal colors.

```tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()

  const className =
    normalized === 'online'
      ? 'bg-[#39FF14]/15 text-[#39FF14] hover:bg-[#39FF14]/25 border-[#39FF14]/30'
      : normalized === 'offline'
      ? 'bg-[#FFC107]/15 text-[#FFC107] hover:bg-[#FFC107]/25 border-[#FFC107]/30'
      : 'bg-[#FF4D4D]/15 text-[#FF4D4D] hover:bg-[#FF4D4D]/25 border-[#FF4D4D]/30'

  return (
    <Badge variant="outline" className={cn('border font-mono text-xs uppercase tracking-wider', className)}>
      {status}
    </Badge>
  )
}
```

- [ ] **Step 2: Create node-card.tsx**

Create `web/src/components/node-card.tsx`:

```tsx
import { MoreHorizontal } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/status-badge'
import { cn } from '@/lib/utils'

export type NodeStatus = 'online' | 'offline' | 'pending'

export interface Node {
  id: string
  name: string
  status: NodeStatus
  platform?: string
  system_info?: Record<string, unknown>
  last_seen_at?: string
  created_at: string
}

interface NodeCardProps {
  node: Node
  onInstallCommand: (id: string) => void
  onReset: (id: string) => void
  onRotateToken: (id: string) => void
}

const statusColorClasses: Record<NodeStatus, string> = {
  online: 'bg-[#39FF14] text-[#39FF14]',
  offline: 'bg-[#FFC107] text-[#FFC107]',
  pending: 'bg-[#FF4D4D] text-[#FF4D4D]',
}

function formatRelativeTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getPrimaryIP(info?: Record<string, unknown>): string {
  const ips = info?.ips
  if (Array.isArray(ips) && ips.length > 0) return String(ips[0])
  return '—'
}

function getResourceSnapshot(info?: Record<string, unknown>): string | null {
  const cpu = info?.cpu_percent
  const mem = info?.memory_used && info?.memory_total
    ? Math.round((Number(info.memory_used) / Number(info.memory_total)) * 100)
    : null
  const parts: string[] = []
  if (typeof cpu === 'number') parts.push(`CPU ${cpu.toFixed(0)}%`)
  if (typeof mem === 'number') parts.push(`MEM ${mem}%`)
  return parts.length > 0 ? parts.join('  ') : null
}

export function NodeCard({ node, onInstallCommand, onReset, onRotateToken }: NodeCardProps) {
  const snapshot = getResourceSnapshot(node.system_info)

  return (
    <Card
      data-testid="node-card"
      className={cn(
        'group relative flex flex-col overflow-hidden border-[#2A3546] bg-[#1F2833] p-4 transition-colors hover:bg-[#2A3546]'
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 group-hover:motion-safe:animate-status-pulse',
          statusColorClasses[node.status]
        )}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-2 pl-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-base font-semibold tracking-tight text-[#C5C6C7]"
            title={node.name}
          >
            {node.name}
          </h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 shrink-0 text-[#8892A0] hover:bg-[#2A3546] hover:text-[#C5C6C7]">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-[#2A3546] bg-[#1F2833]">
            {node.status === 'online' ? (
              <DropdownMenuItem onClick={() => onReset(node.id)} className="focus:bg-[#2A3546] focus:text-[#C5C6C7]">
                Reset
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onInstallCommand(node.id)} className="focus:bg-[#2A3546] focus:text-[#C5C6C7]">
                Install Command
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRotateToken(node.id)} className="focus:bg-[#2A3546] focus:text-[#C5C6C7]">
              Rotate Token
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:bg-[#2A3546] focus:text-[#C5C6C7]">
              <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
                View Details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center justify-between pl-3">
        <StatusBadge status={node.status} />
        <span className="text-xs text-[#8892A0]">{formatRelativeTime(node.last_seen_at)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-3 text-xs text-[#8892A0]">
        <span className="rounded border border-[#2A3546] bg-[#0B0C10] px-1.5 py-0.5 font-mono uppercase">
          {node.platform || '—'}
        </span>
        <span className="font-mono">{getPrimaryIP(node.system_info)}</span>
        {snapshot && <span className="ml-auto font-mono text-[#C5C6C7]">{snapshot}</span>}
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Write node-card.test.tsx**

Create `web/src/components/node-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NodeCard, type Node } from './node-card'

const baseNode: Node = {
  id: 'n1',
  name: 'prod-web-01',
  status: 'online',
  platform: 'linux',
  system_info: { ips: ['10.0.0.4'], cpu_percent: 12, memory_used: 4, memory_total: 16 },
  last_seen_at: new Date(Date.now() - 120_000).toISOString(),
  created_at: new Date().toISOString(),
}

describe('NodeCard', () => {
  it('renders name, status, platform, ip and resource snapshot', () => {
    render(<NodeCard node={baseNode} onInstallCommand={() => {}} onReset={() => {}} onRotateToken={() => {}} />)
    expect(screen.getByText('prod-web-01')).toBeInTheDocument()
    expect(screen.getByText('ONLINE')).toBeInTheDocument()
    expect(screen.getByText('LINUX')).toBeInTheDocument()
    expect(screen.getByText('10.0.0.4')).toBeInTheDocument()
    expect(screen.getByText(/CPU 12%.*MEM 25%/)).toBeInTheDocument()
  })

  it('shows last seen relative time', () => {
    render(<NodeCard node={baseNode} onInstallCommand={() => {}} onReset={() => {}} onRotateToken={() => {}} />)
    expect(screen.getByText(/\d+m ago/)).toBeInTheDocument()
  })

  it('emits reset action for online node', async () => {
    const onReset = vi.fn()
    render(<NodeCard node={baseNode} onReset={onReset} onInstallCommand={() => {}} onRotateToken={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    await userEvent.click(screen.getByText('Reset'))
    expect(onReset).toHaveBeenCalledWith('n1')
  })

  it('emits install command action for offline node', async () => {
    const onInstallCommand = vi.fn()
    const offlineNode: Node = { ...baseNode, status: 'offline' }
    render(<NodeCard node={offlineNode} onInstallCommand={onInstallCommand} onReset={() => {}} onRotateToken={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /actions/i }))
    await userEvent.click(screen.getByText('Install Command'))
    expect(onInstallCommand).toHaveBeenCalledWith('n1')
  })
})
```

- [ ] **Step 4: Run node-card tests**

Run: `cd web && bun run test -- node-card`
Expected: all tests pass.

- [ ] **Step 5: Replace cards in nodes/index.tsx**

Open `web/src/routes/nodes/index.tsx`:

1. Remove imports: `Card, CardContent, CardHeader, CardTitle`, `StatusBadge`, `CopyButton` (still used in dialog), and the inline `Node` type.
2. Add imports:
   ```tsx
   import { NodeCard, type Node } from '@/components/node-card'
   ```
3. Replace the card mapping block (lines 263-306) with:
   ```tsx
   filteredNodes.map((node) => (
     <NodeCard
       key={node.id}
       node={node as Node}
       onInstallCommand={handleShowInstallCommand}
       onReset={handleReset}
       onRotateToken={handleShowInstallCommand}
     />
   ))
   ```
4. Update the skeleton loader to match the new card shape (optional but recommended). For this task, leaving the existing skeleton is acceptable; the next step covers visual polish.

- [ ] **Step 6: Run existing tests**

Run: `cd web && bun run test`
Expected: existing tests still pass; new NodeCard tests pass.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/node-card.tsx web/src/components/node-card.test.tsx web/src/components/status-badge.tsx web/src/routes/nodes/index.tsx
git commit -m "feat(web): redesign node list card with console status light bar"
```

---

## Task 3: Node Detail Info Cards

**Files:**
- Create: `web/src/components/info-card.tsx`
- Create: `web/src/components/resource-card.tsx`
- Modify: `web/src/routes/nodes/$nodeId.tsx`

**Interfaces:**
- Consumes: console theme variables from Task 1.
- Produces: `InfoCard` (`{ title, value }`) and `ResourceCard` (`{ title, used, total, unit? }`) components.

- [ ] **Step 1: Create info-card.tsx**

Create `web/src/components/info-card.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card'

interface InfoCardProps {
  title: string
  value?: string
}

export function InfoCard({ title, value }: InfoCardProps) {
  return (
    <Card className="border-[#2A3546] bg-[#1F2833]">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8892A0]">{title}</p>
        <p className="mt-1 break-words font-mono text-lg font-semibold leading-tight text-[#C5C6C7]">
          {value || '—'}
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create resource-card.tsx**

Create `web/src/components/resource-card.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ResourceCardProps {
  title: string
  used?: number
  total?: number
  unit?: string
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '—'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

export function ResourceCard({ title, used, total, unit }: ResourceCardProps) {
  const ratio = used && total && total > 0 ? used / total : null
  let barColor = 'bg-[#39FF14]'
  if (ratio && ratio > 0.9) barColor = 'bg-[#FF4D4D]'
  else if (ratio && ratio > 0.7) barColor = 'bg-[#FFC107]'

  const valueText =
    used && total
      ? `${formatBytes(used)} / ${formatBytes(total)}`
      : used
      ? `${formatBytes(used)}${unit ? ` ${unit}` : ''}`
      : '—'

  return (
    <Card className="border-[#2A3546] bg-[#1F2833]">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8892A0]">{title}</p>
        <p className="mt-1 font-mono text-lg font-semibold leading-tight text-[#C5C6C7]">{valueText}</p>
        {ratio !== null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#0B0C10]">
            <div
              className={cn('h-full transition-all', barColor)}
              style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Refactor detail page layout**

Open `web/src/routes/nodes/$nodeId.tsx` and replace the return JSX with the new sectioned layout.

Keep imports, loading state, and helper functions as-is. Replace the content block (after the `if (!node)` guard) with:

```tsx
const info = node.system_info || {}
const memoryUsed = Number(info.memory_total) - Number(info.memory_free || 0)
const memoryTotal = Number(info.memory_total)
const diskUsed = Number(info.disk_total) - Number(info.disk_free || 0)
const diskTotal = Number(info.disk_total)

return (
  <div className="space-y-6">
    <PageHeader title={node.name} description="Node details and system information">
      <Link to="/nodes">
        <Button variant="outline" size="icon" className="border-[#2A3546] bg-[#1F2833] text-[#C5C6C7] hover:bg-[#2A3546] hover:text-[#C5C6C7]">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
    </PageHeader>

    {/* Status banner */}
    <div className="relative overflow-hidden rounded-lg border border-[#2A3546] bg-[#1F2833] p-4">
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-2',
          node.status === 'online' ? 'bg-[#39FF14]' : node.status === 'offline' ? 'bg-[#FFC107]' : 'bg-[#FF4D4D]'
        )}
        aria-hidden="true"
      />
      <div className="pl-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={node.status} />
          <span className="text-sm text-[#8892A0]">
            Last seen: {node.last_seen_at ? new Date(node.last_seen_at).toLocaleString() : '—'}
          </span>
          <span className="text-sm text-[#8892A0]">
            Uptime: {info.uptime ? `${Number(info.uptime).toLocaleString()}s` : '—'}
          </span>
        </div>
      </div>
    </div>

    {/* Hardware */}
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8892A0]">Hardware</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Hostname" value={String(info.hostname || '-')} />
        <InfoCard title="OS / Arch" value={`${info.os || '-'} / ${info.arch || '-'}`} />
        <InfoCard title="Kernel" value={String(info.kernel || '-')} />
        <InfoCard title="CPU" value={`${info.cpu_model || '-'} (${info.cpu_cores || '-'} cores)`} />
        <InfoCard title="Platform" value={String(node.platform || '-')} />
      </div>
    </section>

    {/* Resources */}
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8892A0]">Resources</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ResourceCard title="Memory" used={memoryUsed} total={memoryTotal} />
        <ResourceCard title="Disk" used={diskUsed} total={diskTotal} />
        <InfoCard title="CPU Cores" value={String(info.cpu_cores || '-')} />
      </div>
    </section>

    {/* Network */}
    <section>
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8892A0]">Network</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Uptime" value={info.uptime ? `${Number(info.uptime).toLocaleString()}s` : '-'} />
        <InfoCard title="IPs" value={Array.isArray(info.ips) ? info.ips.join(', ') : '-'} />
      </div>
    </section>

    <InstallCommandCard
      installCommand={installCommand}
      loading={rotating}
      onGenerate={handleRotateToken}
    />
  </div>
)
```

Add `cn` import if not already present:

```tsx
import { cn } from '@/lib/utils'
```

- [ ] **Step 4: Run tests**

Run: `cd web && bun run test`
Expected: all unit tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/info-card.tsx web/src/components/resource-card.tsx web/src/routes/nodes/\$nodeId.tsx
git commit -m "feat(web): reorganize node detail into console-style grouped cards"
```

---

## Task 4: Install Command Card

**Files:**
- Modify: `web/src/components/install-command-card.tsx`
- Modify: `web/src/components/install-command-card.test.tsx` (or create)

**Interfaces:**
- Consumes: `CopyButton` (existing), `Button`, `Card`.
- Produces: `InstallCommandDisplay` and `InstallCommandCard` with terminal-session styling.

- [ ] **Step 1: Redesign install-command-card.tsx**

Open `web/src/components/install-command-card.tsx` and replace with:

```tsx
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
  return (
    <Card className="border-[#2A3546] bg-[#1F2833]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-[#8892A0]">
          <span>Install Command</span>
          {props.installCommand && (
            <CopyButton
              text={props.installCommand}
              className="h-7 border-[#2A3546] bg-[#0B0C10] px-2 text-[#C5C6C7] hover:bg-[#2A3546]"
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InstallCommandDisplay {...props} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Update CopyButton if needed**

Open `web/src/components/copy-button.tsx`. Ensure the component accepts `className` and spreads it. If it does not, modify it to accept and merge `className`. Expected interface:

```tsx
interface CopyButtonProps {
  text: string
  className?: string
}
```

- [ ] **Step 3: Add/update install-command-card.test.tsx**

Create or update `web/src/components/install-command-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallCommandCard, InstallCommandDisplay } from './install-command-card'

describe('InstallCommandDisplay', () => {
  it('shows generate prompt when command is empty', async () => {
    const onGenerate = vi.fn()
    render(<InstallCommandDisplay installCommand="" onGenerate={onGenerate} />)
    await userEvent.click(screen.getByRole('button', { name: /generate install command/i }))
    expect(onGenerate).toHaveBeenCalled()
  })

  it('renders command with terminal prompt and copy/regenerate buttons', async () => {
    const onGenerate = vi.fn()
    render(<InstallCommandDisplay installCommand="curl test" onGenerate={onGenerate} />)
    expect(screen.getByText(/curl test/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    expect(onGenerate).toHaveBeenCalled()
  })
})

describe('InstallCommandCard', () => {
  it('renders header title', () => {
    render(<InstallCommandCard installCommand="curl test" onGenerate={() => {}} />)
    expect(screen.getByText('Install Command')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run tests**

Run: `cd web && bun run test -- install-command-card`
Expected: tests pass.

- [ ] **Step 5: Run full test suite**

Run: `cd web && bun run test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/install-command-card.tsx web/src/components/install-command-card.test.tsx web/src/components/copy-button.tsx
git commit -m "feat(web): restyle install command card as terminal session"
```

---

## Final Verification

- [ ] Run: `cd web && bun run build`
Expected: TypeScript compiles without errors and Vite builds successfully.

- [ ] Run: `cd web && bun run test`
Expected: all unit tests pass.

- [ ] Run: `cd panel && go test ./...` and `cd agent && go test ./...`
Expected: backend/agent tests still pass (no changes there, but confirm no regression).

---

## Self-Review

**Spec coverage:**
- Console palette → Task 1
- Node list card status light bar, metadata, actions → Task 2
- Detail page grouped sections, status banner, resource bars → Task 3
- Terminal-session install command card → Task 4
- Reduced-motion / accessibility → noted in global constraints; pulse is CSS-only and can be wrapped in `motion-safe` if needed in Task 2.

**Placeholder scan:**
- No TBD/TODO. All steps include concrete code and commands.

**Type consistency:**
- `Node` type is shared via `node-card.tsx` exports; detail page casts the existing inline type.
- `ResourceCard` expects `used`/`total` as numbers; detail page converts from `system_info`.

**One gap to address during execution:** The CSS pulse glow in `node-card.tsx` should respect `prefers-reduced-motion`. Wrap the `group-hover:shadow` in a `motion-safe:` Tailwind variant or add a media query in `index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .status-bar-pulse {
    animation: none !important;
  }
}
```

During Task 2, replace the arbitrary `group-hover:shadow-[0_0_12px_currentColor]` with a dedicated `motion-safe` class or remove animation if reduced motion is active.
