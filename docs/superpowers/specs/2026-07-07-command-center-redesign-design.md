# BSDock Command Center 前端重设计方案

日期：2026-07-07
状态：已确认，可进入实施计划

## 设计判断

BSDock 是一个 Panel-Node 运维主控面板，用户需要监控从属服务器运行状态、查看运行信息，并快速生成或下发节点安装与配置相关命令。

本次重设计方向是科技风主控中心。界面应像一个实时控制平面，而不是通用后台模板。视觉冲击来自真实产品语义：节点健康、资源压力、流量脉冲、日志终端和命令操作。

设计拨盘：

- DESIGN_VARIANCE: 6
- MOTION_INTENSITY: 4
- VISUAL_DENSITY: 7

原因：产品需要比普通管理后台更强的控制舱气质，但运维用户仍然需要高密度、清晰、可重复使用的工作流。

## 目标

- 打开面板后一秒内能判断系统健康状态。
- 更容易扫描节点状态、资源压力和最后在线时间。
- 保留现有路由、API 调用、hooks 和认证行为。
- 将当前偏分散的霓虹玻璃卡片，升级成统一的主控中心界面。
- 保持深色、技术感和视觉冲击，同时不牺牲可用性。
- 对 reduced motion 用户提供稳定的非动画体验。

## 非目标

- 不引入新的设计系统或重型 UI 依赖。
- 不加入 Three.js、3D 场景或大型视觉资产管线。
- 不修改路由路径、API contract、认证流程或后端行为。
- 不改变业务工作流，只做视觉、布局和交互层改善。
- 本轮不增加浅色主题。当前应用强制 dark theme，本次继续保持这个产品决策。

## 现有系统

前端是 Vite React 应用，使用 TanStack Router、Tailwind CSS、shadcn 风格 Radix primitives、lucide-react icons 和 Motion。当前应用已经有 dark theme、glass utility、resource rings、status badges、page headers 和 live data hooks。

本次重设计沿用现有栈：

- React 19
- TanStack Router
- Tailwind CSS 3
- Radix/shadcn-style UI primitives
- lucide-react，项目已存在
- motion/react，项目已存在
- next-themes，目前强制 dark theme

## 视觉系统

主题：

- 全局暗色 command center 主题。
- 基础底色为深黑蓝。
- 抬升面板使用半透明 navy 和轻微内高光。
- 主强调色为冷青色，用于焦点、主操作和 active navigation。
- 语义色只用于真实状态：绿色 online/healthy，琥珀 pending/warning，红色 offline/destructive。
- 避免把紫色或多色渐变作为通用装饰。

形状：

- 面板统一使用 10-12px 左右圆角。
- 按钮和输入框保持略紧的 8-10px。
- 尽量减少 card inside card，用 spacing、separator 或 grid section 表达层级。

字体：

- 保留当前技术感字体方向。
- 数字、版本号、IP 地址、日志和命令继续使用 mono/tabular 处理。
- 避免大段低对比度 mono 正文，防止阅读疲劳。

动效：

- 页面和面板入场只使用 opacity 与 transform。
- hover 和 active 状态要有触感，但保持克制。
- status pulse 只在表达真实 live state 时使用。
- 所有 CSS animation 必须尊重 `prefers-reduced-motion`。
- 现有组件已经位于 `MotionConfig reducedMotion="user"` 下。

## 信息架构

保留当前 routes 与主要导航：

- `/login`
- `/`
- `/nodes`
- `/nodes/$nodeId`
- `/logs`

本次重设计不静默改变 URL 结构、导航目标、表单字段名或 API 行为。

## 应用壳层

预计影响文件：

- `web/src/routes/__root.tsx`
- `web/src/components/app-sidebar.tsx`
- `web/src/components/app-header.tsx`
- `web/src/components/page-header.tsx`
- `web/src/index.css`
- `web/tailwind.config.ts`

设计：

- Sidebar 升级为控制塔式导航 rail，active route 更明确。
- Header 从空白工具条升级为系统状态条，承载会话、主题状态和页面级上下文。
- Main area 使用稳定内容网格，减少通用 padding 和孤立玻璃块。
- 背景可使用克制的 radial light、grid 或 noise 深度，但不能损害可读性。

## Login Page

文件：

- `web/src/routes/login.tsx`

设计：

- 左侧面板改成系统访问门禁：BSDock identity、三个真实能力点和轻量 live-signal 样式。
- 登录表单保持直接、高对比度。
- 保留 username/password 字段、提交行为、loading state 和 toast 行为。
- 降低装饰性 version footer 的存在感，除非它作为系统元数据有实际意义。

## Home Page

预计影响文件：

- `web/src/routes/index.tsx`
- `web/src/components/panel-hero-card.tsx`
- `web/src/components/panel-probe-card.tsx`
- `web/src/components/stat-card.tsx`
- `web/src/components/traffic-chart.tsx`

设计：

- 将页面重组为 control plane overview。
- 主面板显示系统运行态、panel version、uptime、Go version 和最重要操作。
- 节点状态汇总应像实时 fleet matrix，而不是四个互不关联的 stat cards。
- Traffic section 应像 signal telemetry，强化当前吞吐层级，减少重复卡片感。
- Probe status 需要更明确地关联到平台健康。

## Nodes Page

预计影响文件：

- `web/src/routes/nodes/index.tsx`
- `web/src/components/node-card.tsx`
- `web/src/components/status-badge.tsx`
- `web/src/components/resource-ring.tsx`
- `web/src/components/empty-state.tsx`
- `web/src/components/install-command-card.tsx`

设计：

- filter/search 区域改成 command bar。
- Node cards 改为紧凑 fleet tiles，突出 status、node name、platform、IP、last seen、CPU、memory、disk 和关键操作。
- resource indicators 在卡片尺寸下必须保持可读。
- 节点操作保留现有行为：install command、rotate token、reset 和 detail navigation。
- Empty/loading states 应与最终布局比例一致。

## Node Detail Page

文件：

- `web/src/routes/nodes/$nodeId.tsx`

设计：

- 重构为单节点生命体征页面。
- 顶部大区显示 node identity、status 和 resource rings。
- Network、packet、disk I/O、total sent/received、IPs、hardware、uptime、version 和 install command 分区更清晰。
- 减少在 glass container 内继续嵌套 `Card`。
- 保留 helper formatters 和现有数据 fallback 行为。

## Logs Page

预计影响文件：

- `web/src/routes/logs/index.tsx`
- `web/src/components/log-viewer.tsx`
- `web/src/components/log-line.tsx`

设计：

- Logs 应有 terminal-native 气质，但保持可读。
- Source switcher 表现为 segmented command control。
- Connection state 必须可见且有语义，不作为纯装饰。
- 保留 live log hook 行为和 source values。

## 组件规则

- 继续使用 lucide-react，因为它已是项目依赖。
- 不手写自定义 icon paths。
- 优先使用共享 utility classes 和 CSS variables，减少散落的 hard-coded hex colors。
- Skeleton、empty state 和 error state 与新布局保持同等比例。
- Button 在所有状态下必须保持可读对比度。
- 不修改 route label、form field 或 API payload。

## 测试与验证

实施完成前：

- 修改任何 function、component 或 method 前，按项目要求运行 GitNexus impact analysis。
- 运行 `cd web && bun run typecheck`。
- 运行 `cd web && bun run test`。
- 启动 web dev server，检查 desktop 和 mobile layouts。
- commit 实现前运行 GitNexus `detect-changes`。

手动视觉检查：

- Desktop shell navigation 不与内容重叠。
- Mobile sidebar 能打开、关闭，并保持导航可用。
- Node cards 在 mobile、tablet 和 desktop 宽度下都不溢出。
- Node detail 的长 IPv6 不溢出。
- Install command 文本仍可复制且可读。
- Logs page 适配 viewport，不出现不可用滚动陷阱。
- Reduced motion 会移除 ambient 和 status animations。

## 风险

- 现有测试可能断言具体文案或 DOM 结构，需要随视觉重构同步更新。
- 当前 hard-coded colors 分散在多个组件中，收敛时应分阶段进行，避免无关 churn。
- 当前全局字体技术感强，适合本方向，但如果用于大段正文会降低可读性。
- 本地 GitNexus FTS extension 不可用，natural-language query 降级；实施时应直接对被修改组件和函数运行 symbol-level impact checks。

## 已确认方向

最终方向是 Command Center，科技主控中心风格。它应比标准 SaaS dashboard 更有视觉强度，同时保留运维清晰度和 BSDock 当前全部工作流。
