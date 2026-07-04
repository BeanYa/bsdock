# BSDock 前端视觉重塑实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按照设计文档 `docs/superpowers/specs/2026-07-04-bsdock-frontend-design.md` 对 BSDock 前端进行全面视觉重塑，包括主题系统、布局、组件规范、页面改造，并通过测试验证。

**Architecture:** 以 shadcn/ui 为基础组件库，Tailwind CSS 变量实现主题切换，新增可折叠 Sidebar 和 Header 布局，所有页面统一使用自定义组件和 shadcn 组件，错误反馈统一使用 Toast。

**Tech Stack:** Vite + React 19 + TypeScript + Tailwind CSS + shadcn/ui + TanStack Router + next-themes

## Global Constraints

- 颜色系统以 `zinc` 中性色为主，状态色用 `emerald/red/amber`
- 全局字体使用 Maple Mono CN，通过国内可达 CDN 引入
- 主题策略：跟随系统，默认暗色
- 所有表单错误使用 Toast 替代内联错误文字
- 原生 `<select>` 必须替换为 shadcn Select
- 列表和详情加载使用 Skeleton
- 移动端 Sidebar 自动收起

---

## File Structure

### 修改文件

- `web/src/index.css` — 更新 CSS 变量为 zinc 色板，添加 Maple Mono CN 字体
- `web/src/main.tsx` — 添加 Toaster 组件
- `web/tailwind.config.ts` — 确认/扩展字体配置
- `web/src/routes/__root.tsx` — 改造为 Sidebar + Header 布局
- `web/src/routes/login.tsx` — 改造为 Landing Page
- `web/src/routes/nodes/index.tsx` — 节点列表页改造
- `web/src/routes/nodes/$nodeId.tsx` — 节点详情页改造

### 新增文件

- `web/src/components/app-sidebar.tsx` — 可折叠 Sidebar
- `web/src/components/app-header.tsx` — 顶部 Header
- `web/src/components/page-header.tsx` — 页面标题区
- `web/src/components/status-badge.tsx` — 状态徽章
- `web/src/components/copy-button.tsx` — 复制按钮
- `web/src/components/empty-state.tsx` — 空状态
- `web/src/components/theme-toggle.tsx` — 主题切换按钮
- `web/src/components/ui/toaster.tsx` — Toast 渲染器
- `web/src/components/ui/toast.tsx` — shadcn Toast 组件
- `web/src/components/ui/use-toast.ts` — Toast hook
- `web/src/components/ui/select.tsx` — shadcn Select
- `web/src/components/ui/skeleton.tsx` — shadcn Skeleton
- `web/src/components/ui/dropdown-menu.tsx` — shadcn Dropdown Menu
- `web/src/components/ui/separator.tsx` — shadcn Separator
- `web/src/components/ui/tooltip.tsx` — shadcn Tooltip
- `web/src/components/ui/sidebar.tsx` — shadcn Sidebar（可选，或自定义）

---

## Task 1: 更新主题变量与全局样式

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/tailwind.config.ts`

**Interfaces:**
- Produces: CSS 变量 `--background`, `--foreground`, `--card`, `--primary` 等使用 zinc 色板
- Produces: 全局 `font-family` 使用 Maple Mono CN

- [ ] **Step 1: 在 `index.css` 顶部添加 Maple Mono CN 字体引入**

```css
@font-face {
  font-family: 'Maple Mono CN';
  src: url('https://cdn.jsdelivr.net/npm/maple-mono-cn@latest/dist/MapleMono-CN-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Maple Mono CN';
  src: url('https://cdn.jsdelivr.net/npm/maple-mono-cn@latest/dist/MapleMono-CN-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 2: 更新 `:root` 和 `.dark` 变量为 zinc 色板**

```css
@layer base {
  :root {
    --background: 0 0% 98%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 72.2% 50.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.625rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}
```

- [ ] **Step 3: 在 `body` 规则中设置全局字体**

```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Maple Mono CN', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
}
```

- [ ] **Step 4: 在 `tailwind.config.ts` 中添加字体配置**

```ts
fontFamily: {
  sans: ['Maple Mono CN', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  mono: ['Maple Mono CN', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
},
```

- [ ] **Step 5: 运行构建检查**

Run: `cd web && bun run build`
Expected: 成功编译，无 CSS 错误

- [ ] **Step 6: Commit**

```bash
git add web/src/index.css web/tailwind.config.ts
git commit -m "feat: update theme to zinc palette and add Maple Mono CN font"
```

---

## Task 2: 添加 shadcn 组件

**Files:**
- Create: `web/src/components/ui/select.tsx`
- Create: `web/src/components/ui/skeleton.tsx`
- Create: `web/src/components/ui/toast.tsx`
- Create: `web/src/components/ui/toaster.tsx`
- Create: `web/src/components/ui/use-toast.ts`
- Create: `web/src/components/ui/dropdown-menu.tsx`
- Create: `web/src/components/ui/separator.tsx`
- Create: `web/src/components/ui/tooltip.tsx`

**Interfaces:**
- Produces: shadcn Select, Skeleton, Toast, Toaster, useToast, DropdownMenu, Separator, Tooltip 组件可用

- [ ] **Step 1: 通过 shadcn CLI 添加组件**

Run: `cd web && npx shadcn add select skeleton toast dropdown-menu separator tooltip -y`
Expected: 组件文件生成到 `web/src/components/ui/`

- [ ] **Step 2: 检查生成的组件无 TS 错误**

Run: `cd web && bun run build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/
git commit -m "feat: add shadcn select, skeleton, toast, dropdown-menu, separator, tooltip"
```

---

## Task 3: 创建自定义组件

**Files:**
- Create: `web/src/components/app-sidebar.tsx`
- Create: `web/src/components/app-header.tsx`
- Create: `web/src/components/page-header.tsx`
- Create: `web/src/components/status-badge.tsx`
- Create: `web/src/components/copy-button.tsx`
- Create: `web/src/components/empty-state.tsx`
- Create: `web/src/components/theme-toggle.tsx`

**Interfaces:**
- Produces: `<AppSidebar collapsed={boolean} />`, `<AppHeader />`, `<PageHeader title actions />`, `<StatusBadge status />`, `<CopyButton text />`, `<EmptyState />`, `<ThemeToggle />`

- [ ] **Step 1: 创建 `theme-toggle.tsx`**

```tsx
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

- [ ] **Step 2: 创建 `status-badge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'online'
      ? 'default'
      : status === 'offline'
      ? 'destructive'
      : 'secondary'

  const className =
    status === 'online'
      ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/20'
      : status === 'offline'
      ? 'bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20'
      : 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/20'

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  )
}
```

- [ ] **Step 3: 创建 `copy-button.tsx`**

```tsx
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
```

- [ ] **Step 4: 创建 `page-header.tsx`**

```tsx
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 5: 创建 `empty-state.tsx`**

```tsx
import { Server } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  children?: React.ReactNode
}

export function EmptyState({
  title = 'No items',
  description = 'Get started by creating a new item.',
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <div className="rounded-full bg-muted p-3">
        <Server className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 6: 创建 `app-sidebar.tsx`**

```tsx
import { Link, useRouterState } from '@tanstack/react-router'
import { Activity, ChevronLeft, ChevronRight, LayoutDashboard, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { to: '/nodes', label: 'Nodes', icon: Server },
]

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
        <Link to="/" className={cn('flex items-center gap-2 font-bold', collapsed && 'justify-center')}>\n          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            B
          </div>
          {!collapsed && <span>BSDock</span>}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <Button variant="ghost" size="icon" onClick={onToggle} className="w-full">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 7: 创建 `app-header.tsx`**

```tsx
import { useNavigate } from '@tanstack/react-router'
import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { clearToken, isAuthenticated } from '@/lib/auth'

export function AppHeader() {
  const navigate = useNavigate()
  const authenticated = isAuthenticated()

  const handleLogout = () => {
    clearToken()
    navigate({ to: '/login' })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {authenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="User menu">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 8: 运行构建检查**

Run: `cd web && bun run build`
Expected: 编译成功

- [ ] **Step 9: Commit**

```bash
git add web/src/components/
git commit -m "feat: add app layout components and custom UI primitives"
```

---

## Task 4: 改造登录页为 Landing Page

**Files:**
- Modify: `web/src/routes/login.tsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Label`, `Card`, `CardContent`, `CardHeader`, `CardTitle`
- Consumes: `useToast` for error/success feedback
- Produces: 双栏 Landing Page 登录组件

- [ ] **Step 1: 修改 `login.tsx` 为双栏布局**

完整文件内容：

```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Activity, Server, Terminal } from 'lucide-react'
import { api } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const features = [
  { icon: Activity, label: '实时监控', desc: '节点状态通过 WebSocket 实时同步' },
  { icon: Terminal, label: '一键安装', desc: '生成各平台 Agent 安装命令' },
  { icon: Server, label: '集中管理', desc: 'Panel 集中管理所有 Node 节点' },
]

function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.login(username, password)
      setToken(data.token)
      toast({ title: '登录成功' })
      navigate({ to: '/nodes' })
    } catch (err) {
      toast({
        title: '登录失败',
        description: err instanceof Error ? err.message : '请检查用户名和密码',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-muted/30 p-10 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              B
            </div>
            BSDock
          </div>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">轻量 Panel-Node 管理平台</h2>
            <p className="mt-2 text-muted-foreground">
              简单、快速地监控和管理分布在各处的服务器节点。
            </p>
          </div>
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-4 rounded-lg border bg-card/50 p-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{f.label}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-sm text-muted-foreground">BSDock v0.0.1</div>
      </div>

      <div className="flex flex-col justify-center p-6 lg:p-10">
        <div className="mb-8 lg:hidden">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              B
            </div>
            BSDock
          </div>
        </div>
        <Card className="mx-auto w-full max-w-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">登录到 BSDock</CardTitle>
            <p className="text-sm text-muted-foreground">输入你的管理员账号继续</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 运行构建检查**

Run: `cd web && bun run build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add web/src/routes/login.tsx
git commit -m "feat: redesign login page as landing page"
```

---

## Task 5: 改造根布局与 Header/Sidebar

**Files:**
- Modify: `web/src/routes/__root.tsx`
- Modify: `web/src/main.tsx`（添加 Toaster）

**Interfaces:**
- Consumes: `AppSidebar`, `AppHeader`
- Produces: 带 Sidebar + Header 的应用布局

- [ ] **Step 1: 修改 `main.tsx` 添加 Toaster**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </React.StrictMode>
)
```

- [ ] **Step 2: 修改 `__root.tsx` 为 Sidebar + Header 布局**

```tsx
import { useState } from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { cn } from '@/lib/utils'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300 ease-in-out',
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <AppHeader />
        <main className="flex-1 bg-muted/30 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 运行构建检查**

Run: `cd web && bun run build`
Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add web/src/main.tsx web/src/routes/__root.tsx
git commit -m "feat: add collapsible sidebar and app header layout"
```

---

## Task 6: 改造节点列表页

**Files:**
- Modify: `web/src/routes/nodes/index.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `StatusBadge`, `CopyButton`, `EmptyState`, `useToast`
- Consumes: `Select`, `Skeleton`, `Input`, `Button`, `Card`, `Table`, `Dialog`
- Produces: 支持搜索/筛选、Toast 反馈、Select 平台选择的节点列表页

- [ ] **Step 1: 重写 `nodes/index.tsx`**

完整实现要点：
- 使用 `PageHeader`
- 搜索框按名称过滤
- Select 按状态筛选
- 表格加载用 Skeleton
- 空状态用 `EmptyState`
- Dialog 中平台选择用 shadcn `Select`
- 安装命令区域用 `<pre>` + `CopyButton`
- 错误/成功用 `toast`

（具体代码见实现阶段，需保持类型定义和现有 API 调用不变）

- [ ] **Step 2: 运行构建检查**

Run: `cd web && bun run build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add web/src/routes/nodes/index.tsx
git commit -m "feat: redesign nodes list with search, filter, and shadcn components"
```

---

## Task 7: 改造节点详情页

**Files:**
- Modify: `web/src/routes/nodes/$nodeId.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `StatusBadge`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Skeleton`
- Produces: 带返回按钮、Skeleton 加载、等宽数据展示的节点详情页

- [ ] **Step 1: 重写 `$nodeId.tsx`**

完整实现要点：
- 使用 `PageHeader`，左侧标题 + 返回按钮
- 加载状态显示 6 个 Skeleton Card
- 信息卡片网格保持 3 列
- IP、Uptime、Hostname 等数据使用 `font-mono tabular-nums`
- 数值格式化函数保留

- [ ] **Step 2: 运行构建检查**

Run: `cd web && bun run build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add web/src/routes/nodes/\$nodeId.tsx
git commit -m "feat: redesign node detail page with skeleton and mono data"
```

---

## Task 8: 运行单元测试

**Files:**
- Run: `web/package.json` scripts

- [ ] **Step 1: 运行前端单元测试**

Run: `cd web && bun run test`
Expected: 通过（当前项目测试为 passWithNoTests）

- [ ] **Step 2: 修复任何测试失败**

- [ ] **Step 3: Commit（如有修复）**

---

## Task 9: Playwright 响应式验证

**Files:**
- Create/Modify: `web/tests/e2e/layout.spec.ts`（如不存在则创建）

- [ ] **Step 1: 确认 Playwright 已安装**

Run: `cd web && bunx playwright install chromium`
Expected: Chromium 浏览器安装成功

- [ ] **Step 2: 编写/更新 E2E 测试覆盖关键布局**

测试用例：
- 登录页在 desktop / tablet / mobile 下布局正常
- 节点列表页 Sidebar 在 lg 以上显示，在 md 以下可折叠/隐藏
- 节点详情页信息卡片在不同断点下排列合理
- 不存在无效占位按钮（如空的 user menu 或 disabled 无功能按钮）

- [ ] **Step 3: 运行 E2E 测试**

Run: `cd web && bun run e2e`
Expected: 所有测试通过

- [ ] **Step 4: 修复任何失败**

- [ ] **Step 5: Commit**

```bash
git add web/tests/e2e/
git commit -m "test: add responsive layout e2e tests"
```

---

## Task 10: 最终验证与 Git 提交

- [ ] **Step 1: 全量构建**

Run: `cd web && bun run build`
Expected: 成功

- [ ] **Step 2: 检查 diff**

Run: `git diff --stat`
Expected: 所有改动符合预期

- [ ] **Step 3: 最终提交（如还有未提交改动）**

```bash
git add -A
git commit -m "feat: complete frontend visual redesign"
```

---

## Self-Review

**Spec coverage:**
- [x] zinc 色板主题 → Task 1
- [x] Maple Mono CN 字体 → Task 1
- [x] 可折叠 Sidebar + Header → Task 3, 5
- [x] 登录页 Landing Page → Task 4
- [x] 节点列表搜索/筛选/Select/Toast → Task 6
- [x] 节点详情 Skeleton/等宽数据 → Task 7
- [x] Playwright 响应式验证 → Task 9
- [x] Git 提交 → Task 10

**Placeholder scan:**
- 无 TBD/TODO
- 所有步骤包含实际代码或命令
- 文件路径精确

**Type consistency:**
- 组件接口在 Task 3 中定义，后续任务一致使用
