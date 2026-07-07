# Nodes 页面卡片式布局实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `web/src/routes/nodes/index.tsx` 中的节点列表从 Table 表格改为响应式卡片网格展示，保留搜索、筛选、创建、操作菜单和安装命令弹窗等全部现有交互。

**Architecture:** 使用 shadcn/ui 的 `Card` 组件替代 `Table`，通过 Tailwind CSS Grid 工具类实现响应式列数；除布局展示层外，状态管理、API 调用、弹窗逻辑全部复用现有实现。

**Tech Stack:** Vite + React 19 + TypeScript + Tailwind CSS + shadcn/ui + TanStack Router

## Global Constraints

- 仅修改 `web/src/routes/nodes/index.tsx` 的布局展示部分，不改动 API、Hook 或路由。
- 保留现有搜索框、状态筛选器、New Node 创建弹窗、操作菜单和安装命令展示弹窗。
- 卡片仅展示节点名称（`name`）和状态徽章（`StatusBadge`），操作入口使用现有 DropdownMenu。
- 响应式网格：默认 1 列、`sm:` 2 列、`lg:` 3 列、`xl:` 4 列。
- 加载状态使用卡片骨架屏（Skeleton），空状态继续使用 `EmptyState`。
- 运行 `cd web && bun run build` 与 `cd web && bun run test` 验证通过后再提交。

---

## File Structure

### 修改文件

- `web/src/routes/nodes/index.tsx` — 将 Table 表格展示替换为 Card 卡片网格展示。

---

## Task 1: 将 Nodes 列表改为卡片网格布局

**Files:**
- Modify: `web/src/routes/nodes/index.tsx`

**Interfaces:**
- Consumes: `useNodes()` 返回的 `{ nodes, loading, reload }`
- Consumes: `api.createNode(name, panelURL, platform)` 与 `api.rotateToken(nodeId)`
- Consumes: `StatusBadge`, `EmptyState`, `PageHeader`, `CopyButton`, `InstallCommandDisplay`
- Consumes: shadcn `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Input`, `Label`, `Skeleton`, `Dialog`, `DropdownMenu`, `Select`
- Produces: 响应式卡片网格 Nodes 列表页

- [ ] **Step 1: 移除表格相关导入，增加卡片头部组件导入**

在 `web/src/routes/nodes/index.tsx` 中，将导入区的：

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
```

替换为：

```tsx
import { CardHeader, CardTitle } from '@/components/ui/card'
```

保留原有：

```tsx
import { Card, CardContent } from '@/components/ui/card'
```

- [ ] **Step 2: 替换表格渲染为响应式卡片网格**

找到文件中如下卡片包装：

```tsx
<Card>
  <CardContent className="p-0">
    <div className="w-full overflow-auto">
      <Table>
        ...
      </Table>
    </div>
  </CardContent>
</Card>
```

替换为完整卡片网格实现：

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {loading ? (
    Array.from({ length: 8 }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-16" />
        </CardContent>
      </Card>
    ))
  ) : filteredNodes.length === 0 ? (
    <div className="col-span-full">
      <EmptyState
        title="No nodes found"
        description={nodes.length === 0 ? 'Get started by creating your first node.' : 'Try adjusting your search or filter.'}
      />
    </div>
  ) : (
    filteredNodes.map((node) => (
      <Card key={node.id} className="flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className="truncate text-base font-medium"
              title={node.name}
            >
              {node.name}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShowInstallCommand(node.id)}>
                  Install Command
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShowInstallCommand(node.id)}>
                  Rotate Token
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
                    View Details
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <StatusBadge status={node.status} />
        </CardContent>
      </Card>
    ))
  )}
</div>
```

- [ ] **Step 3: 验证文件其余部分未被意外修改**

确认以下内容保持不变：

- `type Node` 类型定义。
- `statusOptions` 数组。
- `NodesPage` 组件内的所有 `useState`、`useMemo`、事件处理函数（`handleCreate`、`handleOpenChange`、`handleShowInstallCommand`）。
- `PageHeader`、搜索框、状态筛选器、New Node 创建 Dialog、安装命令展示 Dialog。

- [ ] **Step 4: 运行构建检查**

Run: `cd web && bun run build`
Expected: 成功编译，无 TypeScript 或 ESLint 错误。

- [ ] **Step 5: 运行前端单元测试**

Run: `cd web && bun run test`
Expected: 测试通过（当前项目为 passWithNoTests）。

- [ ] **Step 6: 手动验证关键交互**

验证点：
- 页面加载时显示 8 个卡片骨架屏。
- 有节点时按响应式网格排列（1/2/3/4 列）。
- 搜索框按名称过滤卡片。
- 状态筛选器按 `online`/`offline`/`pending` 过滤卡片。
- 点击卡片右上角菜单可弹出 Install Command / Rotate Token / View Details。
- 无节点时显示 `EmptyState` 提示。

- [ ] **Step 7: Commit**

```bash
git add web/src/routes/nodes/index.tsx
git commit -m "feat: redesign nodes list as responsive card grid"
```

---

## Self-Review

**Spec coverage:**
- [x] 表格替换为卡片网格 → Task 1 Step 2
- [x] 响应式列数（1/2/3/4） → Task 1 Step 2
- [x] 卡片展示名称和状态 → Task 1 Step 2
- [x] 保留搜索和状态筛选 → 未改动既有代码
- [x] 保留 New Node 弹窗和操作菜单 → 未改动既有代码
- [x] 加载骨架屏改为卡片形式 → Task 1 Step 2
- [x] 空状态保留 → Task 1 Step 2
- [x] 构建与测试验证 → Task 1 Step 4/5
- [x] Git 提交 → Task 1 Step 7

**Placeholder scan:**
- 无 TBD/TODO
- 所有步骤包含实际代码或命令
- 文件路径精确

**Type consistency:**
- `Node` 类型沿用既有定义
- `filteredNodes` 由既有 `useMemo` 提供
- `handleShowInstallCommand` 由既有函数提供
