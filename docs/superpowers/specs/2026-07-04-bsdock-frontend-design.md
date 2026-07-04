# BSDock 前端视觉重塑设计文档

## 项目背景

BSDock 是一个 Panel-Node 管理平台，当前前端基于 Vite + React 19 + Tailwind CSS + shadcn/ui 构建。现有页面包括登录页、节点列表页、节点详情页。当前存在的问题包括：

- 部分交互元素混用原生组件（如节点创建弹窗中的原生 `<select>`）
- 导航按钮使用自定义样式，未复用 shadcn Button
- 错误提示直接内联，缺乏统一的反馈机制
- 缺少 loading/skeleton 状态
- 整体视觉较朴素，品牌感弱

本方案对前端进行全面的视觉重塑，打造现代、统一的开发工具风格。

## 设计目标

1. 建立统一的视觉系统和组件规范
2. 替换所有原生/自定义组件为 shadcn/ui 组件
3. 优化信息层级，让节点状态一目了然
4. 引入可折叠 Sidebar，提升导航扩展性
5. 将登录页升级为 Landing Page，强化品牌认知
6. 保证暗色/亮色模式的一致体验

## 视觉系统

### 设计原则

1. **清晰优先**：信息层级分明，状态一眼可辨
2. **开发工具感**：暗色默认、精致边框、克制阴影、流畅微交互
3. **一致收敛**：所有交互元素都走 shadcn/ui，不再混用原生组件
4. **响应式可用**：Sidebar 可折叠，移动端自动收起

### 色彩系统

- **中性色**：以 `zinc` 为主（比 slate 更中性，适合现代工具感），通过 CSS 变量映射到 shadcn 的 `background / foreground / muted / card` 等
- **状态色**：
  - 在线：`emerald`
  - 离线：`red`
  - pending / 未知：`amber`
- **强调色**：`zinc-50` 用于主按钮/高亮，`zinc-500` 用于边框和次要文字
- **暗/亮模式**：跟随系统，默认暗色；暗色用更深的 `zinc-950` 背景，亮色用 `zinc-50`

### 字体系统

- **全局字体**：Maple Mono CN
- **引入方式**：通过国内可达 CDN（jsDelivr 或 npmmirror unpkg 镜像）加载
- **数字/状态**：利用 Maple Mono CN 的等宽特性，避免数据展示时的抖动
- **字体回退**：`'Maple Mono CN', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### 字体层级

- 页面标题：`text-2xl font-semibold tracking-tight`
- 卡片标题：`text-base font-medium`
- 正文：`text-sm leading-relaxed`
- 数据/数值：`tabular-nums`

### 间距与圆角

- 全局页面内边距：`p-6`
- 网格间距：`gap-6`
- 卡片内边距：`p-6`
- 圆角基准：`radius: 0.625rem`（卡片等使用 `rounded-xl`）
- 按钮圆角：`rounded-md`

## 布局结构

### 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar       │  Header (logo / search / theme / user) │
│  (collapsible) ├────────────────────────────────────────┤
│                │  Page content (p-6)                    │
└────────────────┴────────────────────────────────────────┘
```

- **Sidebar**：固定宽度 `w-64`，可折叠为 `w-16`（图标模式）。包含 Logo、导航项（Dashboard、Nodes、Settings 等）
- **Header**：高度 `h-14`，底部分割线，右侧放主题切换、用户/登出
- **主内容区**：最小高度 `min-h-[calc(100vh-3.5rem)]`，背景使用 `bg-muted/30` 营造轻微层次

### 导航结构

- `/`：默认重定向到 `/nodes`
- `/nodes`：节点列表
- `/nodes/$nodeId`：节点详情
- （可选，后续扩展）`/dashboard`：概览首页

## 组件规范

### shadcn/ui 组件

已有并继续使用的组件：

- `button`
- `card`
- `table`
- `dialog`
- `input`
- `label`
- `badge`

需要新增/完善的组件：

- `select`：替换节点创建弹窗中的原生 `<select>`
- `skeleton`：列表/详情加载状态
- `toast` / `toaster` / `useToast`：全局通知，替代内联错误
- `dropdown-menu`：用户菜单
- `separator` / `tooltip` / `avatar`（可选）
- `sidebar`：自定义可折叠导航

### 自定义组件

- `StatusBadge`：统一节点状态样式，使用 `emerald/red/amber` 明确语义
- `CopyButton`：带复制反馈的按钮，用于安装命令
- `PageHeader`：统一页面标题 + 操作按钮区域
- `EmptyState`：空列表占位
- `ThemeToggle`：使用 shadcn Button `variant="outline" size="icon"`

### 表单与反馈

- 所有表单错误走 Toast，不再内联 `<p className="text-destructive">`
- 提交按钮加 `disabled={isPending}` 状态
- 输入框统一使用 shadcn Input + Label

## 页面设计

### 登录页 / Landing Page

#### 结构

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   左侧：品牌区                       右侧：登录卡片      │
│   - Logo / 产品名                    - 用户名/密码      │
│   - 一句话 Slogan                    - 登录按钮         │
│   - 3 个核心能力简述                 - Toast 错误提示    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 设计细节

- **布局**：双栏布局（`grid grid-cols-1 lg:grid-cols-2`），左侧占 55%，右侧占 45%
- **左侧品牌区**：
  - 大 Logo：`text-4xl font-bold tracking-tight`
  - Slogan：「轻量 Panel-Node 管理平台」
  - 3 个能力点：节点状态实时监控、一键安装命令、WebSocket 实时同步
  - 底部：版本号或开源链接
- **右侧登录卡片**：
  - 居中的 `Card`，最大宽度 `max-w-sm`
  - 标题：「登录到 BSDock」
  - 输入框 + 按钮
  - 错误通过 Toast 提示，卡片内不再显示红色错误文字
- **移动端**：双栏合并为单栏，品牌区在登录卡上方

#### 视觉风格

- 左侧使用微妙的渐变或网格背景（如 `bg-gradient-to-br from-primary/5 to-background`）
- 能力点使用小图标 + 文字，图标用 `lucide-react`（如 `Server`、`Activity`、`Terminal`）

### 节点列表页

- 顶部 `PageHeader`：左侧标题 + 右侧「New Node」按钮
- 搜索 + 状态筛选栏：
  - 按节点名称实时过滤
  - 按 online / offline / pending 状态筛选
- 表格：
  - 表头使用 `text-muted-foreground font-medium`
  - 行 hover 背景 `hover:bg-muted/50`
  - 状态列宽度固定
  - 「View」按钮改为 `variant="ghost" size="sm"` 或图标按钮
- 空状态：显示「暂无节点」+ 创建按钮
- 加载状态：表格行用 Skeleton
- 创建节点 Dialog：
  - 替换原生 `select` 为 shadcn `Select`
  - 安装命令区域用 `<pre>` + `CopyButton`
  - 成功后 Toast 提示

### 节点详情页

- 顶部 `PageHeader`：节点名称 + 返回按钮 + 状态 Badge
- 信息卡片网格：
  - 保持 `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - 卡片标题用 `text-muted-foreground text-sm`
  - 数值用 `text-lg font-semibold`
  - IP、Uptime 等数据使用 Maple Mono CN 的等宽特性
- 加载状态：用 Skeleton 卡片占位

## 交互与动画

- 页面切换：使用 TanStack Router 默认行为
- 按钮 hover：`transition-colors duration-200`
- 表格行 hover：`transition-colors`
- Dialog 打开/关闭：使用 shadcn 默认动画
- Toast：右下/右上滑入，自动消失
- Sidebar 折叠：宽度过渡动画 `transition-all duration-300 ease-in-out`

## 暗色/亮色适配

- `:root` 亮色变量使用 `zinc` 色板
- `.dark` 暗色变量使用更深的 `zinc-950` 背景、`zinc-900` 卡片背景
- 边框统一使用 `border-border`，确保两种模式下都清晰但不刺眼
- 图表/状态色在两种模式下保持一致饱和度

## 依赖与实现要点

- 字体通过 CDN 引入，需在 `index.css` 或 `main.tsx` 中添加 `@font-face`
- shadcn 组件通过 `npx shadcn add` 添加
- 主题变量在 `src/index.css` 中更新为 zinc 色板
- Toast Provider 需要包裹在 `ThemeProvider` 外层或内层
- Sidebar 折叠状态使用 localStorage 或 URL state 持久化（可选）

## 验收标准

- [ ] 所有页面使用统一的视觉系统（颜色、字体、间距、圆角）
- [ ] 原生 `<select>` 替换为 shadcn Select
- [ ] 错误提示统一使用 Toast
- [ ] 列表/详情加载使用 Skeleton
- [ ] 登录页呈现双栏 Landing Page 布局
- [ ] 节点列表支持搜索 + 状态筛选
- [ ] Sidebar 可折叠，移动端自动收起
- [ ] 暗色/亮色模式切换正常
