# Command Center Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 BSDock 前端重设计为科技风主控中心，同时保留现有路由、API、认证和节点管理工作流。

**Architecture:** 继续使用现有 Vite React + TanStack Router + Tailwind/shadcn-style 结构，不引入新设计系统。先统一全局设计令牌，再重塑 AppShell，随后逐页更新首页、节点列表、节点详情、登录和日志体验。业务 hooks、API payload、route paths 不变。

**Tech Stack:** React 19, TanStack Router, Tailwind CSS 3, Radix/shadcn-style UI primitives, lucide-react, motion/react, next-themes.

## Global Constraints

- 全局保持 dark command center 主题，不增加 light theme。
- 不修改 `/login`、`/`、`/nodes`、`/nodes/$nodeId`、`/logs` 路由。
- 不修改 API contract、auth flow、form field names 或 hook behavior。
- 不新增重型依赖，不引入 Three.js 或新设计系统。
- 继续使用 lucide-react，不手写自定义 icon paths。
- 所有 motion 只使用 opacity 与 transform，并尊重 `prefers-reduced-motion`。
- 每次修改 function、component 或 method 前运行 `rtk node .gitnexus/run.cjs impact <symbol-name> --upstream`。
- 每个任务完成后至少运行对应 frontend tests 或 `rtk bun run typecheck`。
- 实现完成前运行 `rtk node .gitnexus/run.cjs detect-changes`。

---

## File Structure

- `web/src/index.css`: 全局 design tokens、command center background、glass/surface utilities、reduced-motion fallback。
- `web/tailwind.config.ts`: Tailwind token bridge，保留现有 radius/font/color API。
- `web/src/routes/__root.tsx`: AppShell 布局容器、ambient background、sidebar/header 与 content spacing。
- `web/src/components/app-sidebar.tsx`: 控制塔式导航 rail。
- `web/src/components/app-header.tsx`: 系统状态条和用户菜单。
- `web/src/components/page-header.tsx`: 页面标题区域统一样式。
- `web/src/routes/login.tsx`: 科技访问门禁登录页。
- `web/src/routes/index.tsx`: control plane overview 页面结构。
- `web/src/components/panel-hero-card.tsx`: 控制平面主态势卡。
- `web/src/components/panel-probe-card.tsx`: Panel probe 资源与健康状态。
- `web/src/components/stat-card.tsx`: 小型 metric tile。
- `web/src/components/traffic-chart.tsx`: signal telemetry 卡片和 line chart 视觉。
- `web/src/routes/nodes/index.tsx`: command bar、fleet grid、loading/empty states。
- `web/src/components/node-card.tsx`: fleet tile。
- `web/src/components/status-badge.tsx`: 语义状态 badge。
- `web/src/components/resource-ring.tsx`: resource ring 颜色、尺寸和 motion polish。
- `web/src/routes/nodes/$nodeId.tsx`: single-node vitals page。
- `web/src/routes/logs/index.tsx`: terminal-native logs page shell。
- `web/src/components/log-viewer.tsx`: 日志容器视觉。
- `web/src/components/log-line.tsx`: 日志行视觉。
- Test files under `web/src/**/*.test.tsx`: 只在文案或结构断言受影响时更新。

---

### Task 1: Global Design Tokens And Surface Utilities

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/tailwind.config.ts`

**Interfaces:**
- Consumes: existing shadcn CSS variables such as `--background`, `--foreground`, `--card`, `--primary`, `--border`, `--radius`.
- Produces: stable utility classes `.glass`, `.glass-hover`, `.command-surface`, `.command-grid`, `.ambient-light`, `.status-pulse`.

- [ ] **Step 1: Run impact analysis**

Run:

```bash
rtk node .gitnexus/run.cjs impact index.css --upstream
rtk node .gitnexus/run.cjs impact tailwind.config.ts --upstream
```

Expected: low or medium risk. If HIGH or CRITICAL appears, stop and report before editing.

- [ ] **Step 2: Update global tokens and utilities**

In `web/src/index.css`, keep `@tailwind base/components/utilities`, then replace the `:root`, `.dark`, body, and utilities with a command center palette:

```css
:root {
  --background: 222 47% 4%;
  --foreground: 216 22% 94%;
  --card: 220 36% 12% / 0.72;
  --card-foreground: 216 22% 94%;
  --popover: 220 35% 10%;
  --popover-foreground: 216 22% 94%;
  --primary: 187 92% 52%;
  --primary-foreground: 222 47% 4%;
  --secondary: 219 28% 16%;
  --secondary-foreground: 216 22% 94%;
  --muted: 219 28% 13%;
  --muted-foreground: 216 13% 62%;
  --accent: 188 45% 18%;
  --accent-foreground: 188 92% 70%;
  --destructive: 0 78% 62%;
  --destructive-foreground: 0 0% 98%;
  --border: 216 18% 100% / 0.09;
  --input: 219 28% 16%;
  --ring: 187 92% 52%;
  --radius: 0.75rem;
}
```

Add the same values under `.dark`. Add utilities:

```css
.command-surface {
  background:
    linear-gradient(180deg, hsl(220 36% 14% / 0.78), hsl(222 45% 7% / 0.82)),
    hsl(222 47% 4%);
  border: 1px solid hsl(var(--border));
  box-shadow:
    inset 0 1px 0 hsl(0 0% 100% / 0.10),
    0 18px 56px hsl(222 47% 2% / 0.42);
}

.command-grid {
  background-image:
    linear-gradient(hsl(187 92% 52% / 0.045) 1px, transparent 1px),
    linear-gradient(90deg, hsl(187 92% 52% / 0.045) 1px, transparent 1px);
  background-size: 44px 44px;
}
```

Ensure `.ambient-light` and `.status-pulse` retain reduced-motion fallbacks.

- [ ] **Step 3: Keep Tailwind config compatible**

In `web/tailwind.config.ts`, keep existing color keys. Add `fontFamily.sans` fallback ahead of mono only if locally available fonts are not assumed. Do not remove existing `Maple Mono CN`.

- [ ] **Step 4: Verify CSS compiles**

Run:

```bash
cd web
rtk bun run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
rtk git add web/src/index.css web/tailwind.config.ts
rtk git commit -m "style(web): refresh command center tokens"
```

---

### Task 2: Application Shell And Navigation

**Files:**
- Modify: `web/src/routes/__root.tsx`
- Modify: `web/src/components/app-sidebar.tsx`
- Modify: `web/src/components/app-header.tsx`
- Modify: `web/src/components/page-header.tsx`

**Interfaces:**
- Consumes: `AppSidebarProps`, `AppHeaderProps`, TanStack Router `Link`, existing `isAuthenticated`, `clearToken`.
- Produces: same exported `AppSidebar`, `AppHeader`, `PageHeader` components with unchanged external props.

- [ ] **Step 1: Run impact analysis**

```bash
rtk node .gitnexus/run.cjs impact RootComponent --upstream
rtk node .gitnexus/run.cjs impact AppSidebar --upstream
rtk node .gitnexus/run.cjs impact AppHeader --upstream
rtk node .gitnexus/run.cjs impact PageHeader --upstream
```

Expected: AppShell and route components only. Stop on HIGH or CRITICAL risk.

- [ ] **Step 2: Update root shell layout**

In `web/src/routes/__root.tsx`, keep page view logging logic. Change shell markup to:

```tsx
return (
  <div className="min-h-screen bg-background text-foreground">
    <div className="fixed inset-0 -z-10 bg-background" aria-hidden="true" />
    <div className="fixed inset-0 -z-10 command-grid opacity-60" aria-hidden="true" />
    <div className="fixed inset-0 -z-10 ambient-light" aria-hidden="true" />
    <AppSidebar
      collapsed={collapsed}
      onToggle={() => setCollapsed((v) => !v)}
      mobileOpen={mobileOpen}
      onMobileClose={() => setMobileOpen(false)}
    />
    <div
      className={cn(
        'flex min-h-screen flex-col transition-[padding] duration-300 ease-out',
        collapsed ? 'lg:pl-20' : 'lg:pl-72'
      )}
    >
      <AppHeader onMobileMenuOpen={() => setMobileOpen(true)} />
      <main className="flex-1 px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
        <div className="mx-auto w-full max-w-[1520px]">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
)
```

- [ ] **Step 3: Redesign sidebar without changing navigation targets**

In `web/src/components/app-sidebar.tsx`, keep `navItems` destinations. Use width `lg:w-72` expanded and `lg:w-20` collapsed. Active links should use cyan left rail and darker selected background. Keep mobile overlay with `X` close button and same `onMobileClose`.

- [ ] **Step 4: Redesign header as system bar**

In `web/src/components/app-header.tsx`, keep logout behavior. Add compact text labels such as `Command Center` and `Session active` only when authenticated. Keep `ThemeToggle` unless removed by an explicit later task.

- [ ] **Step 5: Update page header**

In `web/src/components/page-header.tsx`, ensure it renders:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
  <div className="min-w-0">
    <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
    {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
  </div>
  {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
</div>
```

- [ ] **Step 6: Run shell tests**

```bash
cd web
rtk bun run test -- --runInBand
rtk bun run typecheck
```

Expected: PASS. If `--runInBand` is unsupported by Vitest, rerun `rtk bun run test`.

- [ ] **Step 7: Commit**

```bash
rtk git add web/src/routes/__root.tsx web/src/components/app-sidebar.tsx web/src/components/app-header.tsx web/src/components/page-header.tsx
rtk git commit -m "style(web): reshape command center shell"
```

---

### Task 3: Home Control Plane Overview

**Files:**
- Modify: `web/src/routes/index.tsx`
- Modify: `web/src/components/panel-hero-card.tsx`
- Modify: `web/src/components/panel-probe-card.tsx`
- Modify: `web/src/components/stat-card.tsx`
- Modify: `web/src/components/traffic-chart.tsx`
- Test: `web/src/components/traffic-chart.test.tsx`
- Test: `web/src/components/panel-probe-card.test.tsx`

**Interfaces:**
- Consumes: `PanelStatus`, `usePanelStatus(5000)`, `TrafficCharts({ sent, received, updatedAt })`.
- Produces: same `PanelHeroCard`, `PanelProbeCard`, `TrafficCharts`, `StatCard` exports.

- [ ] **Step 1: Run impact analysis**

```bash
rtk node .gitnexus/run.cjs impact HomePage --upstream
rtk node .gitnexus/run.cjs impact PanelHeroCard --upstream
rtk node .gitnexus/run.cjs impact PanelProbeCard --upstream
rtk node .gitnexus/run.cjs impact TrafficCharts --upstream
rtk node .gitnexus/run.cjs impact StatCard --upstream
```

- [ ] **Step 2: Recompose `HomePage` grid**

In `web/src/routes/index.tsx`, keep authentication redirect and loading/error behavior. Change content to a 12-column grid:

```tsx
<div className="space-y-5">
  <motion.section className="grid grid-cols-1 gap-4 xl:grid-cols-12" ...>
    <div className="xl:col-span-8">
      <PanelHeroCard status={status} />
    </div>
    <div className="grid grid-cols-2 gap-3 xl:col-span-4">
      <StatCard ... />
    </div>
  </motion.section>
  <motion.section className="grid grid-cols-1 gap-4 xl:grid-cols-12" ...>
    <div className="xl:col-span-5">
      <PanelProbeCard status={status} />
    </div>
    <div className="xl:col-span-7">
      <TrafficCharts ... />
    </div>
  </motion.section>
</div>
```

- [ ] **Step 3: Redesign hero as command plane**

In `PanelHeroCard`, keep update dialog state and placeholder update behavior. Use a large status header, platform metadata row, and two action buttons. Keep `Update` and `/nodes` actions intact.

- [ ] **Step 4: Redesign telemetry cards**

In `TrafficCharts`, keep `useTrafficHistory`, `formatSpeed`, `LineChart` math. Change outer layout from three equal cards to one command-surface panel with three metric headers and chart columns inside it. Preserve accessible `Collecting data...` state.

- [ ] **Step 5: Update tests only for visible text changes**

Run:

```bash
cd web
rtk bun run test src/components/traffic-chart.test.tsx src/components/panel-probe-card.test.tsx
```

If tests fail because text changed, update assertions to the new visible labels, not implementation classes.

- [ ] **Step 6: Verify**

```bash
cd web
rtk bun run typecheck
rtk bun run test src/components/traffic-chart.test.tsx src/components/panel-probe-card.test.tsx
```

- [ ] **Step 7: Commit**

```bash
rtk git add web/src/routes/index.tsx web/src/components/panel-hero-card.tsx web/src/components/panel-probe-card.tsx web/src/components/stat-card.tsx web/src/components/traffic-chart.tsx web/src/components/traffic-chart.test.tsx web/src/components/panel-probe-card.test.tsx
rtk git commit -m "style(web): rebuild control plane overview"
```

---

### Task 4: Fleet Nodes Page

**Files:**
- Modify: `web/src/routes/nodes/index.tsx`
- Modify: `web/src/components/node-card.tsx`
- Modify: `web/src/components/resource-ring.tsx`
- Modify: `web/src/components/status-badge.tsx`
- Modify: `web/src/components/empty-state.tsx`
- Test: `web/src/components/node-card.test.tsx`
- Test: `web/src/components/nodes-page.test.tsx`
- Test: `web/src/components/resource-ring.test.tsx`
- Test: `web/src/components/status-badge.test.tsx`

**Interfaces:**
- Consumes: `Node` type, `NodeCardProps`, `useNodes`, `api.createNode`, `api.rotateToken`, `api.resetNode`.
- Produces: same node actions and route navigation.

- [ ] **Step 1: Run impact analysis**

```bash
rtk node .gitnexus/run.cjs impact NodesPage --upstream
rtk node .gitnexus/run.cjs impact NodeCard --upstream
rtk node .gitnexus/run.cjs impact ResourceRing --upstream
rtk node .gitnexus/run.cjs impact StatusBadge --upstream
```

- [ ] **Step 2: Redesign command bar**

In `NodesPage`, keep state names and handlers. Replace the filter wrapper with a `command-surface` search command bar. Preserve `Search nodes...`, `statusOptions`, `New Node`, and dialog behavior.

- [ ] **Step 3: Redesign fleet grid**

Keep grid responsive:

```tsx
<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
```

Loading skeletons must use the same tile proportions as `NodeCard`.

- [ ] **Step 4: Redesign `NodeCard` as fleet tile**

Keep helper functions and `useIsBelowSm`. Preserve overlay link and dropdown. Tile must show:

- Status strip.
- Node name and `StatusBadge`.
- Platform, primary IP, last seen.
- CPU/MEM/Disk rings.
- Uptime and version compact metadata.
- `Install Command` and `Reset` actions.

- [ ] **Step 5: Resource and status polish**

In `ResourceRing`, reduce glow intensity and keep threshold colors:

- `>= 90`: destructive red.
- `>= 70`: amber.
- otherwise: semantic resource color.

In `StatusBadge`, keep existing variants and add command center border/background tokens.

- [ ] **Step 6: Run focused tests**

```bash
cd web
rtk bun run test src/components/node-card.test.tsx src/components/nodes-page.test.tsx src/components/resource-ring.test.tsx src/components/status-badge.test.tsx
rtk bun run typecheck
```

- [ ] **Step 7: Commit**

```bash
rtk git add web/src/routes/nodes/index.tsx web/src/components/node-card.tsx web/src/components/resource-ring.tsx web/src/components/status-badge.tsx web/src/components/empty-state.tsx web/src/components/node-card.test.tsx web/src/components/nodes-page.test.tsx web/src/components/resource-ring.test.tsx web/src/components/status-badge.test.tsx
rtk git commit -m "style(web): redesign fleet node tiles"
```

---

### Task 5: Single Node Vitals Page

**Files:**
- Modify: `web/src/routes/nodes/$nodeId.tsx`
- Modify: `web/src/components/info-card.tsx`
- Modify: `web/src/components/install-command-card.tsx`
- Test: `web/src/routes/nodes/-$nodeId.test.tsx`
- Test: `web/src/components/info-card.test.tsx`
- Test: `web/src/components/install-command-card.test.tsx`

**Interfaces:**
- Consumes: `useNode(nodeId)`, `api.rotateToken(nodeId)`, existing format helpers.
- Produces: unchanged route `/nodes/$nodeId`, unchanged rotate token behavior, unchanged install command display props.

- [ ] **Step 1: Run impact analysis**

```bash
rtk node .gitnexus/run.cjs impact NodeDetailPage --upstream
rtk node .gitnexus/run.cjs impact InfoCard --upstream
rtk node .gitnexus/run.cjs impact InstallCommandCard --upstream
```

- [ ] **Step 2: Recompose detail page sections**

In `NodeDetailPage`, keep all helper functions. Replace nested card-heavy status hero with:

- PageHeader with back icon button.
- `command-surface` vitals panel containing node identity, `StatusBadge`, and three `ResourceRing` blocks.
- Compact metric grid for Network, Packets, Disk I/O.
- Two-column data section for Total Data and IP Addresses.
- Hardware grid using `InfoCard`.
- Install command section.

- [ ] **Step 3: Preserve overflow safety**

Ensure IP values use:

```tsx
className="break-all font-mono text-xs font-semibold text-foreground"
```

for IPv6 and long values.

- [ ] **Step 4: Update shared cards**

In `InfoCard`, keep props unchanged and switch styling to compact command-surface compatible panel.

In `InstallCommandCard`, preserve copy/generate behavior and improve contrast for command text.

- [ ] **Step 5: Run focused tests**

```bash
cd web
rtk bun run test src/routes/nodes/-$nodeId.test.tsx src/components/info-card.test.tsx src/components/install-command-card.test.tsx
rtk bun run typecheck
```

If PowerShell expands `$nodeId`, run the test with quoted path:

```bash
cd web
rtk bun run test 'src/routes/nodes/-$nodeId.test.tsx'
```

- [ ] **Step 6: Commit**

```bash
rtk git add web/src/routes/nodes/\$nodeId.tsx web/src/components/info-card.tsx web/src/components/install-command-card.tsx web/src/routes/nodes/-\$nodeId.test.tsx web/src/components/info-card.test.tsx web/src/components/install-command-card.test.tsx
rtk git commit -m "style(web): rebuild node vitals page"
```

---

### Task 6: Login And Logs Experience

**Files:**
- Modify: `web/src/routes/login.tsx`
- Modify: `web/src/routes/logs/index.tsx`
- Modify: `web/src/components/log-viewer.tsx`
- Modify: `web/src/components/log-line.tsx`
- Test: `web/src/components/log-viewer.test.tsx` if present

**Interfaces:**
- Consumes: `api.login`, `setToken`, `useLogs(source)`, `LogSource` values `runtime` and `request`.
- Produces: same login and logs behavior.

- [ ] **Step 1: Run impact analysis**

```bash
rtk node .gitnexus/run.cjs impact LoginPage --upstream
rtk node .gitnexus/run.cjs impact LogsPage --upstream
rtk node .gitnexus/run.cjs impact LogViewer --upstream
rtk node .gitnexus/run.cjs impact LogLine --upstream
```

- [ ] **Step 2: Redesign login page**

Keep `features`, `handleSubmit`, `username`, `password`, and toast behavior. Convert left side to command access gate with product identity and capability rows. Keep mobile identity visible above the form.

- [ ] **Step 3: Redesign logs page**

Keep `sources`, `source`, `useLogs(source)`. Change source buttons into a segmented control:

```tsx
<div className="inline-flex rounded-lg border border-white/[0.08] bg-black/20 p-1">
  {sources.map(...)}
</div>
```

Keep connected state text `已连接` / `未连接` and show errors inline.

- [ ] **Step 4: Redesign log viewer**

In `LogViewer`, use full-height terminal panel with command-surface styling. In `LogLine`, keep severity/source parsing and improve timestamp/source contrast.

- [ ] **Step 5: Verify**

```bash
cd web
rtk bun run typecheck
rtk bun run test
```

- [ ] **Step 6: Commit**

```bash
rtk git add web/src/routes/login.tsx web/src/routes/logs/index.tsx web/src/components/log-viewer.tsx web/src/components/log-line.tsx
rtk git commit -m "style(web): polish access and logs views"
```

---

### Task 7: Final Visual QA And Regression Pass

**Files:**
- Modify only files needed for small fixes found during QA.

**Interfaces:**
- Consumes: all tasks above.
- Produces: verified Command Center redesign.

- [ ] **Step 1: Run full frontend verification**

```bash
cd web
rtk bun run typecheck
rtk bun run test
```

Expected: both pass.

- [ ] **Step 2: Run GitNexus change detection**

```bash
rtk node .gitnexus/run.cjs detect-changes
```

Expected: affected symbols limited to planned frontend components/routes/styles. If backend or unrelated flows appear, inspect before proceeding.

- [ ] **Step 3: Start dev server**

```bash
cd web
rtk bun run dev
```

Expected: Vite serves the app, usually at `http://localhost:5173/`.

- [ ] **Step 4: Browser QA**

Check:

- `/login` at desktop and mobile widths.
- `/` overview at desktop and mobile widths.
- `/nodes` with loading, empty, and populated states if data is available.
- `/nodes/$nodeId` with long IPv6 values if fixture/data is available.
- `/logs` terminal height and connection state.
- Reduced motion by forcing reduced motion in browser/devtools if available.

- [ ] **Step 5: Fix visual defects**

Only apply small scoped fixes:

- Text overflow.
- Button contrast.
- Mobile spacing.
- Excessive nested-card appearance.
- Missing reduced-motion fallback.

After any fix, rerun:

```bash
cd web
rtk bun run typecheck
rtk bun run test
```

- [ ] **Step 6: Final commit if QA fixes exist**

```bash
rtk git add web/src web/tailwind.config.ts
rtk git commit -m "fix(web): refine command center qa issues"
```

Skip this commit if no QA fixes were needed.

---

## Self-Review

- Spec coverage: the plan covers global theme, AppShell, Login, Home, Nodes, Node Detail, Logs, shared components, tests, visual QA, and GitNexus checks.
- Placeholder scan: no unresolved placeholder markers or unspecified test steps remain.
- Type consistency: exported component names and props match existing files; no API contract changes are introduced.
- Risk handling: each task starts with GitNexus impact analysis and ends with focused verification.
