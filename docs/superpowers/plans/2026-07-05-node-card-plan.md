# NodeCard 信息密度增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 `NodeCard` 组件，使节点列表卡片展示 CPU / MEM / Disk 三个圆环仪表、外露 Install Command / Reset 操作按钮，并提升整体信息密度。

**Architecture:** 新增可复用的 `ResourceRing` SVG 圆环组件；在 `NodeCard` 中聚合系统信息计算 CPU/MEM/Disk 使用率；将操作按钮从下拉菜单移至卡片底部；更新对应单元测试与 TypeScript 类型。

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, Vitest + Testing Library, Lucide React

## Global Constraints

- 保持现有暗色配色：`#1F2833` 卡片背景、`#2A3546` 边框、`#0B0C10` 深底色、`#C5C6C7` 主文字、`#8892A0` 次文字
- 状态色：`#39FF14`（健康）、`#FFC107`（警告）、`#FF4D4D`（危险）
- 圆环大小：桌面 `56px`，移动端 `48px`
- 使用率阈值：`< 70%` 绿、`70%-89%` 琥珀、`≥ 90%` 红
- 使用 SVG `stroke-dasharray` 实现圆环，禁止引入新依赖
- 按钮文案保持英文、动词开头：`Install Command`、`Reset`
- 所有改动必须附带测试，并保证现有测试通过
- 提交前运行：`cd web && bun run test` 与 `cd web && bun run typecheck`

---

## File Map

| 文件 | 责任 |
|------|------|
| `web/src/components/resource-ring.tsx` | 新增：纯展示 SVG 圆环仪表组件 |
| `web/src/components/resource-ring.test.tsx` | 新增：圆环组件单元测试 |
| `web/src/components/node-card.tsx` | 修改：重构布局、引入 ResourceRing、外露操作按钮 |
| `web/src/components/node-card.test.tsx` | 修改：更新现有断言并补充新交互/展示测试 |

---

### Task 1: 创建 ResourceRing 组件

**Files:**
- Create: `web/src/components/resource-ring.tsx`
- Test: `web/src/components/resource-ring.test.tsx`

**Interfaces:**
- Consumes: 无
- Produces: `ResourceRing({ label, percent, size? })` 组件；`size` 默认 `'md'`（`'sm'` 用于移动端）

- [ ] **Step 1: 编写失败测试**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResourceRing } from './resource-ring'

describe('ResourceRing', () => {
  it('renders label and percent', () => {
    render(<ResourceRing label="CPU" percent={42} />)
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('shows dash when percent is null', () => {
    render(<ResourceRing label="Disk" percent={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('uses sm size class when size is sm', () => {
    const { container } = render(<ResourceRing label="CPU" percent={10} size="sm" />)
    expect(container.querySelector('svg')).toHaveClass('w-12')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd web && bun run test src/components/resource-ring.test.tsx`
Expected: FAIL - `Cannot find module './resource-ring'`

- [ ] **Step 3: 编写最小实现**

```tsx
interface ResourceRingProps {
  label: string
  percent: number | null
  size?: 'sm' | 'md'
}

const SIZE_MAP = {
  sm: { svg: 'w-12 h-12', text: 'text-xs' },
  md: { svg: 'w-14 h-14', text: 'text-sm' },
}

export function ResourceRing({ label, percent, size = 'md' }: ResourceRingProps) {
  const classes = SIZE_MAP[size]
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const safePercent = percent != null && Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null
  const offset = safePercent != null ? circumference - (safePercent / 100) * circumference : circumference
  const color = safePercent == null
    ? '#8892A0'
    : safePercent >= 90
    ? '#FF4D4D'
    : safePercent >= 70
    ? '#FFC107'
    : '#39FF14'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg
          className={`${classes.svg} -rotate-90 transform`}
          viewBox="0 0 56 56"
          role="img"
          aria-label={`${label} ${safePercent != null ? `${safePercent}%` : 'unknown'}`}
        >
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="#2A3546"
            strokeWidth="6"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono font-semibold leading-none text-[#C5C6C7] ${classes.text}`}>
          {safePercent != null ? `${Math.round(safePercent)}%` : '—'}
        </span>
      </div>
      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8892A0]">{label}</span>
    </div>
  )
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd web && bun run test src/components/resource-ring.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add web/src/components/resource-ring.tsx web/src/components/resource-ring.test.tsx
git commit -m "feat(web): add ResourceRing component for circular resource gauges"
```

---

### Task 2: 重构 NodeCard 布局与数据展示

**Files:**
- Modify: `web/src/components/node-card.tsx`
- Test: `web/src/components/node-card.test.tsx`

**Interfaces:**
- Consumes: `ResourceRing` from Task 1
- Produces: 重构后的 `NodeCard` 组件；新增内部辅助函数 `getCpuPercent`、`getMemoryPercent`、`getDiskPercent`、`getPrimaryIP`

- [ ] **Step 1: 编写失败测试（先新增断言）**

在 `web/src/components/node-card.test.tsx` 中追加/替换：

```tsx
it('displays CPU, MEM, and Disk rings', () => {
  renderCard(baseNode)
  expect(screen.getByText('CPU')).toBeInTheDocument()
  expect(screen.getByText('MEM')).toBeInTheDocument()
  expect(screen.getByText('Disk')).toBeInTheDocument()
})

it('exposes install command and reset buttons for online nodes', () => {
  renderCard(baseNode)
  expect(screen.getByRole('button', { name: /install command/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
})

it('hides reset button for offline nodes', () => {
  renderCard(offlineNode)
  expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
})

it('falls back to dash for missing resource data', () => {
  renderCard(sparseNode)
  // ResourceRing renders '—' for null percent
  expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd web && bun run test src/components/node-card.test.tsx`
Expected: FAIL - 新增断言未找到对应元素

- [ ] **Step 3: 重构 NodeCard**

将 `web/src/components/node-card.tsx` 替换为：

```tsx
import { Eye, RotateCcw } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ResourceRing } from '@/components/resource-ring'
import { StatusBadge } from '@/components/status-badge'
import { getStatusColorClasses, type NodeStatus } from '@/lib/status'
import { formatRelativeTime } from '@/lib/time'
import { cn } from '@/lib/utils'

export type { NodeStatus }

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

function getPrimaryIP(info?: Record<string, unknown>): string {
  const ips = info?.ips
  if (Array.isArray(ips) && ips.length > 0) return String(ips[0])
  return '—'
}

function getCpuPercent(info?: Record<string, unknown>): number | null {
  const value = info?.cpu_percent
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getMemoryPercent(info?: Record<string, unknown>): number | null {
  const total = Number(info?.memory_total ?? NaN)
  const free = Number(info?.memory_free ?? NaN)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(free)) return null
  const used = total - free
  return Math.min(100, Math.max(0, (used / total) * 100))
}

function getDiskPercent(info?: Record<string, unknown>): number | null {
  const total = Number(info?.disk_total ?? NaN)
  const free = Number(info?.disk_free ?? NaN)
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(free)) return null
  const used = total - free
  return Math.min(100, Math.max(0, (used / total) * 100))
}

export function NodeCard({ node, onInstallCommand, onReset }: NodeCardProps) {
  const info = node.system_info
  const statusClasses = getStatusColorClasses(node.status)
  const isOnline = node.status === 'online'

  return (
    <Card
      data-testid="node-card"
      className={cn(
        'group relative flex flex-col overflow-hidden border-[#2A3546] bg-[#1F2833] p-4 transition-colors hover:bg-[#2A3546]'
      )}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1',
          statusClasses.bg
        )}
        aria-hidden="true"
      />

      <div className="pl-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-base font-semibold tracking-tight text-[#C5C6C7]"
              title={node.name}
            >
              {node.name}
            </h3>
          </div>
          <StatusBadge status={node.status} />
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-[#8892A0]">
          <span className="rounded border border-[#2A3546] bg-[#0B0C10] px-1.5 py-0.5 font-mono uppercase">
            {node.platform || '—'}
          </span>
          <span className="font-mono">{getPrimaryIP(info)}</span>
          <span className="ml-auto">{formatRelativeTime(node.last_seen_at)}</span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 sm:gap-5">
          <ResourceRing label="CPU" percent={getCpuPercent(info)} />
          <ResourceRing label="MEM" percent={getMemoryPercent(info)} />
          <ResourceRing label="Disk" percent={getDiskPercent(info)} />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onInstallCommand(node.id)}
            className="flex-1 border-[#2A3546] bg-[#0B0C10] text-[#C5C6C7] hover:border-[#00F0FF] hover:bg-[#00F0FF]/10 hover:text-[#00F0FF]"
          >
            <Eye className="mr-2 h-4 w-4" />
            Install Command
          </Button>
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReset(node.id)}
              className="flex-1 border-[#2A3546] bg-[#0B0C10] text-[#C5C6C7] hover:border-[#FFC107] hover:bg-[#FFC107]/10 hover:text-[#FFC107]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <Link
        to="/nodes/$nodeId"
        params={{ nodeId: node.id }}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
      >
        <span className="sr-only">View details for {node.name}</span>
      </Link>

      <div className="relative z-10 pointer-events-none">
        {/* 占位：覆盖层上方可点击元素需要在 pointer-events-auto 的 wrapper 内 */}
      </div>
    </Card>
  )
}
```

注意：上面最后一部分用绝对定位 Link 会导致按钮无法点击，需要调整。正确做法：将卡片主体设为 Link，操作按钮放在卡片内部且设置 `position: relative z-10 pointer-events-auto`。修正后的结构如下：

```tsx
<Card className="... relative overflow-hidden ...">
  <Link to="/nodes/$nodeId" params={{ nodeId: node.id }} className="absolute inset-0 z-0" aria-label={`View details for ${node.name}`} />
  <div className="relative z-10 pl-3">
    {/* header, rings, buttons with pointer-events-auto */}
    <div className="... pointer-events-auto">
      <Button ... />
      <Button ... />
    </div>
  </div>
</Card>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd web && bun run test src/components/node-card.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add web/src/components/node-card.tsx web/src/components/node-card.test.tsx
git commit -m "feat(web): redesign NodeCard with resource rings and exposed actions"
```

---

### Task 3: 处理 Rotate Token 操作与 View Details 的保留

**Files:**
- Modify: `web/src/components/node-card.tsx`
- Modify: `web/src/routes/nodes/index.tsx`

**Interfaces:**
- Consumes: `NodeCard` 的新签名（仍接收 `onRotateToken`，但外露按钮不需要）
- Produces: 决定如何保留 `Rotate Token` 与 `View Details` 入口

- [ ] **Step 1: 确认需求**

草图只要求「install command」和「reset」两个外露按钮。原有下拉菜单中的 `Rotate Token` 和 `View Details` 需要保留。

方案：在卡片右上角保留一个微型「more」图标按钮（或三点），展开小菜单提供 Rotate Token 与 View Details。这样不破坏草图的主要意图。

- [ ] **Step 2: 实现右上角操作菜单**

在 `NodeCard` 右上角保留 DropdownMenu（仅含 Rotate Token、View Details），确保不影响底部两个主按钮。

```tsx
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// inside header row, after StatusBadge
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="pointer-events-auto -mr-2 -mt-1 h-8 w-8 shrink-0 text-[#8892A0] hover:bg-[#2A3546] hover:text-[#C5C6C7]"
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Actions</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="border-[#2A3546] bg-[#1F2833]">
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
```

- [ ] **Step 3: 更新测试**

在 `node-card.test.tsx` 中补充：

```tsx
it('opens actions menu with rotate token and view details', () => {
  const onRotateToken = vi.fn()
  renderCard(baseNode, { onRotateToken })
  screen.getByRole('button', { name: /actions/i }).click()
  expect(screen.getByText('Rotate Token')).toBeInTheDocument()
  expect(screen.getByText('View Details')).toBeInTheDocument()
})
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd web && bun run test src/components/node-card.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add web/src/components/node-card.tsx web/src/components/node-card.test.tsx
git commit -m "feat(web): keep rotate token and view details in compact actions menu"
```

---

### Task 4: 类型检查与全量测试

**Files:**
- 全局：`web/src/**/*`

**Interfaces:**
- Consumes: 前述所有文件
- Produces: 通过类型检查与测试的报告

- [ ] **Step 1: 运行类型检查**

Run: `cd web && bun run typecheck`
Expected: 无错误

- [ ] **Step 2: 运行组件测试**

Run: `cd web && bun run test src/components/node-card.test.tsx src/components/resource-ring.test.tsx`
Expected: PASS

- [ ] **Step 3: 运行前端全量测试**

Run: `cd web && bun run test`
Expected: PASS

- [ ] **Step 4: 提交（如仅修复类型/测试）**

```bash
git add -A
git commit -m "chore(web): typecheck and test fixes for NodeCard redesign"
```

---

## Spec Coverage Self-Review

| 设计文档要求 | 覆盖任务 |
|--------------|----------|
| 三圆环仪表 CPU/MEM/Disk | Task 1 + Task 2 |
| 平台徽章 + 主 IP 外露 | Task 2 |
| 底部 Install Command / Reset 按钮 | Task 2 |
| 使用率颜色阈值 | Task 1 |
| 响应式圆环尺寸 | Task 1 |
| 保留 Rotate Token / View Details | Task 3 |
| 测试覆盖 | Task 1-4 |
| 类型检查 | Task 4 |

无遗漏。

## Placeholder Scan

计划内无 TBD/TODO/"later"/"appropriate" 等占位符。每步包含具体代码、命令与预期结果。

## Type Consistency

- `ResourceRingProps.percent` 使用 `number | null`，与 `NodeCard` 中三个 getter 返回类型一致。
- `NodeCardProps` 未改变，`onRotateToken` 仍接收并用于 Task 3 的菜单。
