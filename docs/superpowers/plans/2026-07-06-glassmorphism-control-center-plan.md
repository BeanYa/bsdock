# Glassmorphism Control Center Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire BSDock authenticated frontend around a night-operations glassmorphism aesthetic, updating the global shell, login page, home dashboard, node list, node detail, and shared components.

**Architecture:** Keep the existing React + TanStack Router + shadcn/ui component structure; introduce a reusable `GlassCard` primitive, update CSS variables for the deep-space palette, and rebuild every visible surface in place. Motion is implemented with CSS keyframes and Motion `whileInView`, no GSAP.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 3.4, shadcn/ui, Vitest + Testing Library, lucide-react, motion (formerly framer-motion).

## Global Constraints

- All colors derive from the glassmorphism token system in the design spec.
- `Maple Mono CN` remains the only font family.
- Reduced-motion preference disables ambient drift, status-bar pulse, and ring load animation.
- Reduced-transparency preference shows solid panel fallback (`#0F1620`).
- All status indicators include text equivalents (no color-only communication).
- New shared primitive lives under `web/src/components/glass-card.tsx`.
- Tests live next to components (`*.test.tsx`) or in `web/tests/e2e/` following existing convention.
- Commit after every task.

---

## File Map

| File | Responsibility |
|---|---|
| `web/src/index.css` | Deep-space color tokens, ambient light layer CSS, glass utilities, reduced-motion fallbacks. |
| `web/src/components/glass-card.tsx` | Reusable glass panel primitive with optional status light bar and hover glow. |
| `web/src/components/app-sidebar.tsx` | Glass sidebar with active-item cyan glow. |
| `web/src/components/app-header.tsx` | Glass sticky header. |
| `web/src/components/page-header.tsx` | Updated page header typography. |
| `web/src/components/status-badge.tsx` | Updated signal colors for glass context. |
| `web/src/components/stat-card.tsx` | Glass stat card with top status light. |
| `web/src/routes/login.tsx` | Split-screen glass login page. |
| `web/src/routes/index.tsx` | Glass home dashboard layout. |
| `web/src/components/panel-hero-card.tsx` | Glass system status hero. |
| `web/src/components/panel-probe-card.tsx` | Glass probe / telemetry panel. |
| `web/src/components/traffic-chart.tsx` | Glass chart container styling. |
| `web/src/routes/nodes/index.tsx` | Glass toolbar + card grid. |
| `web/src/components/node-card.tsx` | Glass node card with top status light and hover glow. |
| `web/src/routes/nodes/$nodeId.tsx` | Glass node detail page. |
| `web/src/components/info-card.tsx` | Glass info tile. |
| `web/src/components/resource-card.tsx` | Glass resource tile with usage bar. |
| `web/src/components/resource-ring.tsx` | Resource ring with glass styling. |
| `web/src/components/install-command-card.tsx` | Terminal-in-glass install command card. |
| `web/tests/e2e/layout.spec.ts` | Updated E2E selectors. |

---

## Task 1: Global Theme & Ambient Layer

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/src/main.tsx`
- Test: `cd web && bun run build`

**Interfaces:**
- Consumes: none
- Produces: CSS custom properties for `--background`, `--card`, `--primary`, etc., all in the glassmorphism palette. Utility classes `.glass`, `.glass-hover`, `.ambient-light`, `.status-pulse`.

- [ ] **Step 1: Replace CSS variables with deep-space glass tokens**

Open `web/src/index.css` and replace the `:root` and `.dark` blocks with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 40% 4%;          /* #080A0F */
    --foreground: 220 18% 93%;         /* #E8EBF0 */
    --card: 218 35% 14% / 0.55;        /* rgba(20, 28, 45, 0.55) */
    --card-foreground: 220 18% 93%;    /* #E8EBF0 */
    --popover: 218 35% 14%;            /* #141C2D */
    --popover-foreground: 220 18% 93%;
    --primary: 186 100% 50%;           /* #00F0FF */
    --primary-foreground: 220 40% 4%;
    --secondary: 218 30% 18%;          /* #1E2A42 */
    --secondary-foreground: 220 18% 93%;
    --muted: 218 30% 18%;
    --muted-foreground: 218 15% 60%;   /* #8B95A8 */
    --accent: 218 30% 18%;
    --accent-foreground: 220 18% 93%;
    --destructive: 0 100% 65%;         /* #FF4D4D */
    --destructive-foreground: 0 0% 98%;
    --border: 220 20% 100% / 0.08;     /* rgba(255,255,255,0.08) */
    --input: 218 30% 18%;
    --ring: 186 100% 50%;              /* #00F0FF */
    --radius: 0.625rem;
  }

  .dark {
    --background: 220 40% 4%;
    --foreground: 220 18% 93%;
    --card: 218 35% 14% / 0.55;
    --card-foreground: 220 18% 93%;
    --popover: 218 35% 14%;
    --popover-foreground: 220 18% 93%;
    --primary: 186 100% 50%;
    --primary-foreground: 220 40% 4%;
    --secondary: 218 30% 18%;
    --secondary-foreground: 220 18% 93%;
    --muted: 218 30% 18%;
    --muted-foreground: 218 15% 60%;
    --accent: 218 30% 18%;
    --accent-foreground: 220 18% 93%;
    --destructive: 0 100% 65%;
    --destructive-foreground: 0 0% 98%;
    --border: 220 20% 100% / 0.08;
    --input: 218 30% 18%;
    --ring: 186 100% 50%;
  }
}
```

- [ ] **Step 2: Add glass and ambient utilities**

Append to `web/src/index.css`:

```css
@layer utilities {
  .glass {
    background: hsl(218 35% 14% / 0.55);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      0 8px 32px rgba(0, 0, 0, 0.35);
  }

  .glass-hover {
    transition: border-color 150ms ease-out, box-shadow 150ms ease-out, transform 150ms ease-out;
  }

  .glass-hover:hover {
    border-color: rgba(0, 240, 255, 0.35);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.14),
      0 12px 40px rgba(0, 240, 255, 0.08);
    transform: translateY(-2px);
  }

  .ambient-light {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(circle at 20% 30%, rgba(0, 240, 255, 0.04) 0%, transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(57, 255, 20, 0.03) 0%, transparent 40%);
    animation: ambient-drift 20s ease-in-out infinite alternate;
  }

  @keyframes ambient-drift {
    0% { transform: translate(-2%, -2%) scale(1); }
    100% { transform: translate(2%, 2%) scale(1.05); }
  }

  @keyframes status-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
    50% { opacity: 0.85; box-shadow: 0 0 16px 3px currentColor; }
  }

  .status-pulse {
    animation: status-pulse 1.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .ambient-light {
      animation: none;
    }
    .status-pulse {
      animation: none;
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    .glass {
      background: #0F1620;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }
}
```

- [ ] **Step 3: Verify build**

Run: `cd web && bun run build`
Expected: TypeScript compiles and Vite builds successfully.

- [ ] **Step 4: Commit**

```bash
git add web/src/index.css
git commit -m "feat(web): add deep-space glassmorphism tokens and ambient layer"
```

---

## Task 2: Glass Card Primitive

**Files:**
- Create: `web/src/components/glass-card.tsx`
- Create: `web/src/components/glass-card.test.tsx`

**Interfaces:**
- Consumes: `NodeStatus` from `@/lib/status`
- Produces: `GlassCard({ children, className, status, hover, glow })` component.

- [ ] **Step 1: Write failing test**

Create `web/src/components/glass-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { GlassCard } from './glass-card'

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>content</GlassCard>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('shows status light bar for online status', () => {
    const { container } = render(<GlassCard status="online">content</GlassCard>)
    const bar = container.querySelector('[data-testid="status-light"]')
    expect(bar).toHaveClass('bg-[#39FF14]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && bun run test src/components/glass-card.test.tsx`
Expected: FAIL - module not found.

- [ ] **Step 3: Implement GlassCard**

Create `web/src/components/glass-card.tsx`:

```tsx
import { cn } from '@/lib/utils'
import { getStatusColorClasses, type NodeStatus } from '@/lib/status'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  status?: NodeStatus
  hover?: boolean
  glow?: boolean
}

export function GlassCard({ children, className, status, hover = true, glow = true }: GlassCardProps) {
  const statusClasses = status ? getStatusColorClasses(status) : null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]',
        hover && 'transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(0,240,255,0.35)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_40px_rgba(0,240,255,0.08)]',
        className
      )}
    >
      {status && (
        <div
          data-testid="status-light"
          className={cn('absolute left-0 right-0 top-0 h-[3px]', statusClasses?.bg)}
          aria-hidden="true"
        />
      )}
      {status && <div className="pt-[3px]">{children}</div>}
      {!status && children}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && bun run test src/components/glass-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/glass-card.tsx web/src/components/glass-card.test.tsx
git commit -m "feat(web): add GlassCard primitive with status light bar"
```

---

## Task 3: App Shell (Sidebar + Header)

**Files:**
- Modify: `web/src/routes/__root.tsx`
- Modify: `web/src/components/app-sidebar.tsx`
- Modify: `web/src/components/app-header.tsx`
- Test: `cd web && bun run test`

**Interfaces:**
- Consumes: `GlassCard` styling patterns
- Produces: glass sidebar and glass sticky header

- [ ] **Step 1: Add ambient light container to root layout**

Open `web/src/routes/__root.tsx` and add a fixed ambient layer div:

```tsx
<div className="fixed inset-0 -z-10 bg-background" aria-hidden="true" />
<div className="fixed inset-0 -z-10 ambient-light" aria-hidden="true" />
```

Place both inside the outer `min-h-screen` wrapper.

- [ ] **Step 2: Convert sidebar to glass panel**

Open `web/src/components/app-sidebar.tsx` and replace sidebar background classes:

```tsx
className={cn(
  'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/[0.08] bg-[rgba(20,28,45,0.75)] backdrop-blur-xl transition-all duration-300 ease-in-out lg:flex',
  collapsed ? 'w-16' : 'w-64'
)}
```

For mobile sidebar use the same background. Update active nav link to:

```tsx
active
  ? 'border-l-2 border-[#00F0FF] bg-[rgba(0,240,255,0.08)] text-[#00F0FF] shadow-[inset_0_0_12px_rgba(0,240,255,0.08)]'
  : 'text-[#8B95A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E8EBF0]'
```

- [ ] **Step 3: Convert header to glass sticky bar**

Open `web/src/components/app-header.tsx` and replace header classes:

```tsx
<header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.08] bg-[rgba(8,10,15,0.75)] px-4 backdrop-blur-xl">
```

- [ ] **Step 4: Run tests**

Run: `cd web && bun run test`
Expected: all unit tests still pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/routes/__root.tsx web/src/components/app-sidebar.tsx web/src/components/app-header.tsx
git commit -m "feat(web): glassmorphism app shell with ambient light"
```

---

## Task 4: Shared Component Styling

**Files:**
- Modify: `web/src/components/page-header.tsx`
- Modify: `web/src/components/status-badge.tsx`
- Modify: `web/src/components/stat-card.tsx`
- Test: `cd web && bun run test`

**Interfaces:**
- Consumes: glass token colors
- Produces: updated shared presentational components

- [ ] **Step 1: Update PageHeader**

Open `web/src/components/page-header.tsx` and replace with:

```tsx
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#E8EBF0]">{title}</h1>
        {description && <p className="text-sm text-[#8B95A8]">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Update StatusBadge**

Open `web/src/components/status-badge.tsx`. Keep logic, update palette for higher contrast against glass:

```tsx
const palette =
  normalized === 'online'
    ? 'bg-[#39FF14]/15 text-[#39FF14] hover:bg-[#39FF14]/25 border-[#39FF14]/40 shadow-[0_0_12px_rgba(57,255,20,0.08)]'
    : normalized === 'offline'
    ? 'bg-[#FFC107]/15 text-[#FFC107] hover:bg-[#FFC107]/25 border-[#FFC107]/40 shadow-[0_0_12px_rgba(255,193,7,0.08)]'
    : 'bg-[#FF4D4D]/15 text-[#FF4D4D] hover:bg-[#FF4D4D]/25 border-[#FF4D4D]/40 shadow-[0_0_12px_rgba(255,77,77,0.08)]'
```

- [ ] **Step 3: Update StatCard to glass**

Open `web/src/components/stat-card.tsx` and replace with:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getStatusColorClasses } from '@/lib/status'

interface StatCardProps {
  title: string
  value?: number | string
  description?: string
  icon?: React.ReactNode
  className?: string
  status?: 'online' | 'offline' | 'pending'
}

export function StatCard({ title, value, description, icon, className, status }: StatCardProps) {
  const statusClasses = status ? getStatusColorClasses(status) : null

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]',
        'transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(0,240,255,0.35)]',
        className
      )}
    >
      {status && <div className={cn('absolute left-0 right-0 top-0 h-[3px]', statusClasses?.bg)} aria-hidden="true" />}
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[#8B95A8]">{title}</p>
          <p className="mt-1 font-mono text-2xl font-semibold leading-none text-[#E8EBF0]">
            {value ?? '—'}
          </p>
          {description && <p className="mt-1 truncate text-xs text-[#8B95A8]/70">{description}</p>}
        </div>
        {icon && (
          <div className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[rgba(8,10,15,0.6)] text-[#8B95A8]">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `cd web && bun run test`
Expected: existing tests pass; update snapshots/selectors if needed.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/page-header.tsx web/src/components/status-badge.tsx web/src/components/stat-card.tsx
git commit -m "feat(web): glassmorphism shared component styling"
```

---

## Task 5: Login Page

**Files:**
- Modify: `web/src/routes/login.tsx`
- Test: `cd web && bun run test`

**Interfaces:**
- Consumes: glass tokens
- Produces: split-screen glass login page

- [ ] **Step 1: Redesign login layout**

Open `web/src/routes/login.tsx` and replace the return JSX with:

```tsx
return (
  <div className="relative grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
    <div className="ambient-light" aria-hidden="true" />

    {/* Left status panel */}
    <div className="relative hidden flex-col justify-between border-r border-white/[0.08] bg-[rgba(20,28,45,0.45)] p-12 backdrop-blur-xl lg:flex lg:p-16 xl:p-20">
      <div>
        <div className="flex items-center gap-2 text-2xl font-bold text-[#E8EBF0]">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00F0FF] text-[#080A0F]">
            B
          </div>
          BSDock
        </div>
      </div>

      <div className="w-full max-w-xl space-y-8">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#E8EBF0]">轻量 Panel-Node 管理平台</h2>
          <p className="mt-2 text-[#8B95A8]">
            简单、快速地监控和管理分布在各处的服务器节点。
          </p>
        </div>

        <div className="space-y-3">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-[rgba(8,10,15,0.45)] p-4 backdrop-blur-md"
            >
              <div className="rounded-md border border-white/[0.08] bg-[rgba(0,240,255,0.12)] p-2 text-[#00F0FF]">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-[#E8EBF0]">{f.label}</h3>
                <p className="text-sm text-[#8B95A8]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-[#8B95A8]">BSDock v0.0.1</div>
    </div>

    {/* Right login form */}
    <div className="relative flex flex-col justify-center p-6 lg:p-10">
      <div className="mb-8 lg:hidden">
        <div className="flex items-center gap-2 text-2xl font-bold text-[#E8EBF0]">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00F0FF] text-[#080A0F]">
            B
          </div>
          BSDock
        </div>
        <p className="mt-2 text-sm text-[#8B95A8]">轻量 Panel-Node 管理平台</p>
      </div>

      <Card className="mx-auto w-full max-w-sm border-white/[0.08] bg-[rgba(20,28,45,0.65)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-[#E8EBF0]">登录到 BSDock</CardTitle>
          <p className="text-sm text-[#8B95A8]">输入你的管理员账号继续</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#8B95A8]">用户名</Label>
              <Input
                id="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-white/[0.08] bg-[rgba(8,10,15,0.6)] text-[#E8EBF0] placeholder:text-[#8B95A8]/50 focus-visible:ring-[#00F0FF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#8B95A8]">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-white/[0.08] bg-[rgba(8,10,15,0.6)] text-[#E8EBF0] placeholder:text-[#8B95A8]/50 focus-visible:ring-[#00F0FF]"
              />
            </div>
            <Button type="submit" className="w-full bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
)
```

- [ ] **Step 2: Run tests**

Run: `cd web && bun run test`
Expected: tests pass.

- [ ] **Step 3: Commit**

```bash
git add web/src/routes/login.tsx
git commit -m "feat(web): glassmorphism login page"
```

---

## Task 6: Home Dashboard

**Files:**
- Modify: `web/src/routes/index.tsx`
- Modify: `web/src/components/panel-hero-card.tsx`
- Modify: `web/src/components/panel-probe-card.tsx`
- Modify: `web/src/components/traffic-chart.tsx`
- Modify: `web/src/components/stat-card.tsx` usage
- Test: `cd web && bun run test`

**Interfaces:**
- Consumes: `StatCard` with status prop
- Produces: glass home dashboard

- [ ] **Step 1: Update StatCard usage in home page**

Open `web/src/routes/index.tsx` and add `status` prop to each `StatCard`:

```tsx
<StatCard title="Total Nodes" value={status?.nodes.total ?? '—'} description="Registered agents" icon={<Server className="h-4 w-4" />} status="online" />
<StatCard title="Online" value={status?.nodes.online ?? '—'} description="Active agents" icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />} status="online" />
<StatCard title="Offline" value={status?.nodes.offline ?? '—'} description="Disconnected" icon={<XCircle className="h-4 w-4 text-rose-400" />} status="offline" />
<StatCard title="Pending" value={status?.nodes.pending ?? '—'} description="Awaiting install" icon={<Clock className="h-4 w-4 text-amber-400" />} status="pending" />
```

- [ ] **Step 2: Convert PanelHeroCard to glass**

Open `web/src/components/panel-hero-card.tsx` and replace the outer `Card` classes:

```tsx
<Card className="relative overflow-hidden border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
```

Update all hardcoded text colors to use `#E8EBF0` and `#8B95A8`. Update buttons to glass outline style.

- [ ] **Step 3: Convert PanelProbeCard to glass**

Open `web/src/components/panel-probe-card.tsx` and apply the same glass card classes. Ensure inner tiles use `bg-[rgba(8,10,15,0.45)]` and `border-white/[0.08]`.

- [ ] **Step 4: Convert TrafficChart container to glass**

Open `web/src/components/traffic-chart.tsx` and wrap the chart in a glass Card with the standard classes.

- [ ] **Step 5: Run tests**

Run: `cd web && bun run test`
Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add web/src/routes/index.tsx web/src/components/panel-hero-card.tsx web/src/components/panel-probe-card.tsx web/src/components/traffic-chart.tsx
git commit -m "feat(web): glassmorphism home dashboard"
```

---

## Task 7: Node List Page

**Files:**
- Modify: `web/src/routes/nodes/index.tsx`
- Modify: `web/src/components/node-card.tsx`
- Modify: `web/src/components/node-card.test.tsx`
- Test: `cd web && bun run test -- node-card`

**Interfaces:**
- Consumes: `GlassCard` primitive
- Produces: glass node cards with top status light and hover glow

- [ ] **Step 1: Redesign NodeCard with glass**

Open `web/src/components/node-card.tsx` and replace the outer `Card` with glass styling:

```tsx
<Card
  data-testid="node-card"
  className={cn(
    'group relative flex flex-col overflow-hidden rounded-xl border-white/[0.08] bg-[rgba(20,28,45,0.55)] p-4 backdrop-blur-xl',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]',
    'transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(0,240,255,0.35)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_40px_rgba(0,240,255,0.08)]'
  )}
>
  <div
    className={cn(
      'absolute left-0 right-0 top-0 h-[3px] transition-opacity',
      statusClasses.bg,
      'group-hover:status-pulse'
    )}
    aria-hidden="true"
  />
  ...
</Card>
```

Update internal text colors to `#E8EBF0` / `#8B95A8`. Update mini-tiles to `bg-[rgba(8,10,15,0.45)] border-white/[0.08]`.

- [ ] **Step 2: Update NodeCard tests**

Open `web/src/components/node-card.test.tsx`. Update selectors if needed to match new markup. Ensure all existing assertions still pass.

- [ ] **Step 3: Update nodes/index toolbar**

Open `web/src/routes/nodes/index.tsx` and wrap search/filter in a glass toolbar panel:

```tsx
<div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[rgba(20,28,45,0.55)] p-3 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)] sm:flex-row">
```

Update input classes to glass style.

- [ ] **Step 4: Update skeleton cards**

Update skeleton placeholders to match glass card shape with top bar area.

- [ ] **Step 5: Run tests**

Run: `cd web && bun run test -- node-card`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/node-card.tsx web/src/components/node-card.test.tsx web/src/routes/nodes/index.tsx
git commit -m "feat(web): glassmorphism node list cards and toolbar"
```

---

## Task 8: Node Detail Page

**Files:**
- Modify: `web/src/routes/nodes/$nodeId.tsx`
- Modify: `web/src/components/info-card.tsx`
- Modify: `web/src/components/resource-card.tsx`
- Modify: `web/src/components/resource-ring.tsx`
- Test: `cd web && bun run test`

**Interfaces:**
- Consumes: glass tokens
- Produces: glass node detail page

- [ ] **Step 1: Convert info-card to glass**

Open `web/src/components/info-card.tsx`:

```tsx
<Card className="border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
```

Update text colors.

- [ ] **Step 2: Convert resource-card to glass**

Open `web/src/components/resource-card.tsx` and apply the same glass Card classes. Keep usage bar logic.

- [ ] **Step 3: Update ResourceRing for glass**

Open `web/src/components/resource-ring.tsx`. Add a subtle glass drop-shadow to the SVG container and ensure label colors pop.

- [ ] **Step 4: Convert detail page layout**

Open `web/src/routes/nodes/$nodeId.tsx`. Wrap the status hero and each section in glass panels:

```tsx
{/* Status hero */}
<div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(20,28,45,0.55)] p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)] sm:p-5">
  <div className={cn('absolute left-0 right-0 top-0 h-1', getStatusColorClasses(node.status).bg)} aria-hidden="true" />
  ...
</div>
```

Wrap each section's grid in a glass panel or apply glass styling to individual cards. Convert inner data tiles to `bg-[rgba(8,10,15,0.45)]`.

- [ ] **Step 5: Run tests**

Run: `cd web && bun run test`
Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/info-card.tsx web/src/components/resource-card.tsx web/src/components/resource-ring.tsx web/src/routes/nodes/\$nodeId.tsx
git commit -m "feat(web): glassmorphism node detail page"
```

---

## Task 9: Install Command Card

**Files:**
- Modify: `web/src/components/install-command-card.tsx`
- Modify: `web/src/components/install-command-card.test.tsx`
- Test: `cd web && bun run test -- install-command-card`

**Interfaces:**
- Consumes: glass tokens
- Produces: terminal-in-glass install command card

- [ ] **Step 1: Convert InstallCommandCard to glass**

Open `web/src/components/install-command-card.tsx` and replace outer Card classes:

```tsx
<Card className="border-white/[0.08] bg-[rgba(20,28,45,0.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
```

Update terminal block:

```tsx
<div className="relative overflow-hidden rounded-md border border-white/[0.08] bg-[#050607] p-4 shadow-inner">
  <div className="absolute left-0 top-0 h-full w-1 bg-[#00F0FF]" aria-hidden="true" />
  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all pl-3 font-mono text-sm leading-relaxed text-[#E8EBF0]">
    <code>
      <span className="select-none text-[#39FF14]">$ </span>
      {installCommand}
    </code>
  </pre>
</div>
```

Update buttons to glass outline style with cyan hover.

- [ ] **Step 2: Update install-command-card tests**

Ensure selectors still match.

- [ ] **Step 3: Run tests**

Run: `cd web && bun run test -- install-command-card`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/install-command-card.tsx web/src/components/install-command-card.test.tsx
git commit -m "feat(web): glassmorphism terminal install command card"
```

---

## Task 10: Motion Layer

**Files:**
- Modify: `web/src/routes/index.tsx`
- Modify: `web/src/routes/nodes/index.tsx`
- Modify: `web/src/routes/nodes/$nodeId.tsx`
- Test: `cd web && bun run build`

**Interfaces:**
- Consumes: `motion/react`
- Produces: staggered entrance animations on major sections

- [ ] **Step 1: Verify motion dependency**

Run: `cd web && grep -q '"motion"' package.json || echo "motion not found"`
If missing, install it: `cd web && bun add motion`.

- [ ] **Step 2: Add staggered entrance to home page**

Open `web/src/routes/index.tsx` and wrap each section in:

```tsx
import { motion } from 'motion/react'

<motion.section
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.1 }}
>
```

Use increasing delay values for each section.

- [ ] **Step 3: Add entrance to node list cards**

Open `web/src/routes/nodes/index.tsx` and wrap the card grid or individual `NodeCard` in:

```tsx
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: index * 0.05 }}
>
```

- [ ] **Step 4: Add entrance to node detail sections**

Open `web/src/routes/nodes/$nodeId.tsx` and wrap major sections in `motion.section` with staggered delays.

- [ ] **Step 5: Run build**

Run: `cd web && bun run build`
Expected: TypeScript compiles.

- [ ] **Step 6: Commit**

```bash
git add web/src/routes/index.tsx web/src/routes/nodes/index.tsx web/src/routes/nodes/\$nodeId.tsx package.json bun.lock
git commit -m "feat(web): add orchestrated entrance motion"
```

---

## Task 11: Tests & E2E Selectors

**Files:**
- Modify: `web/tests/e2e/layout.spec.ts`
- Modify: affected `*.test.tsx` files
- Test: `cd web && bun run test` and `cd web && bunx playwright test tests/e2e/layout.spec.ts --project=chromium`

**Interfaces:**
- Consumes: updated component markup
- Produces: passing unit and E2E tests

- [ ] **Step 1: Update E2E selectors**

Open `web/tests/e2e/layout.spec.ts`. Keep existing test logic; verify selectors for `node-card`, menu items, and headings still work. Adjust only if markup changes broke them.

- [ ] **Step 2: Run unit tests**

Run: `cd web && bun run test`
Expected: all tests pass.

- [ ] **Step 3: Run E2E tests**

Run: `cd web && bunx playwright test tests/e2e/layout.spec.ts --project=chromium`
Expected: all tests pass. If playwright browsers are not installed, run `bunx playwright install chromium` first.

- [ ] **Step 4: Run build**

Run: `cd web && bun run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add web/tests/e2e/layout.spec.ts web/src/**/*.test.tsx
git commit -m "test(web): update selectors and tests for glassmorphism redesign"
```

---

## Final Verification

- [ ] Run: `cd web && bun run build`
  Expected: TypeScript compiles without errors and Vite builds successfully.

- [ ] Run: `cd web && bun run test`
  Expected: all unit tests pass.

- [ ] Run: `cd web && bunx playwright test tests/e2e/layout.spec.ts --project=chromium`
  Expected: E2E tests pass.

- [ ] Run: `cd panel && go test ./...` and `cd agent && go test ./...`
  Expected: backend/agent tests still pass.

---

## Self-Review

**Spec coverage:**
- Global theme + ambient layer → Task 1
- GlassCard primitive → Task 2
- App shell glass sidebar/header → Task 3
- Shared component styling → Task 4
- Login page → Task 5
- Home dashboard → Task 6
- Node list → Task 7
- Node detail → Task 8
- Install command card → Task 9
- Motion layer → Task 10
- Tests/E2E → Task 11

**Placeholder scan:**
- No TBD/TODO.
- All steps include concrete code, commands, and expected output.

**Type consistency:**
- `GlassCard` uses `NodeStatus` from `@/lib/status`, consistent with `StatusBadge` and `NodeCard`.
- `StatCard` receives `status?: 'online' | 'offline' | 'pending'` matching existing status vocabulary.
- `motion` is imported from `motion/react` as specified in the design skill.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-glassmorphism-control-center-plan.md`.

**Execution approach:** Subagent-Driven (as requested by user).

Next step: invoke `superpowers:subagent-driven-development` and dispatch tasks sequentially, reviewing after each task.
