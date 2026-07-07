# Task 2 Report: Application Shell And Navigation

## 实现内容

- 按 brief 重构 `web/src/routes/__root.tsx` 的应用壳层，保留页面访问日志逻辑，新增 `command-grid` 背景层，并把主内容区切到 `max-w-[1520px]` 容器内。
- 重做 `web/src/components/app-sidebar.tsx` 的桌面和移动导航外观，保持原有 `navItems` 路由目标不变，桌面宽度改为展开 `lg:w-72` / 收起 `lg:w-20`，选中态使用青色左侧 rail 与更深的背景。
- 重做 `web/src/components/app-header.tsx` 的 system bar，保留 `ThemeToggle` 和原有 logout 行为；认证态下显示 `Command Center` / `Session active` 文案。
- 按 brief 更新 `web/src/components/page-header.tsx` 的标题与操作区布局，增强截断、响应式换行和描述文案间距。

## Impact 分析

说明：worktree 内存在 `.gitnexus/run.cjs`，因此直接使用 `rtk node .gitnexus/run.cjs ... --repo bsdock`。

- `RootComponent`: LOW，`impactedCount=0`
- `AppSidebar`: LOW，1 个直接调用方 `RootComponent`
- `AppHeader`: LOW，1 个直接调用方 `RootComponent`
- `PageHeader`（通过 `--file web/src/components/page-header.tsx --kind Function` 消除歧义）: LOW，2 个直接调用方 `NodesPage`、`NodeDetailPage`

结论：未出现 HIGH / CRITICAL 风险，影响范围符合应用壳层与节点页头部组件预期。

## 测试命令与结果

1. `cd web && rtk bun run test -- --runInBand`
   - 结果：失败
   - 原因：Vitest 2.1.9 不支持 `--runInBand`，报错 `Unknown option --runInBand`
2. `cd web && rtk bun run test`
   - 结果：通过，16 个测试文件 / 67 个测试全部通过
3. `cd web && rtk bun run typecheck`
   - 结果：通过
4. `rtk node .gitnexus/run.cjs detect-changes --repo bsdock`
   - 结果：4 个文件、6 个 symbol、2 条 execution flows、`Risk level: medium`
   - 受影响流程：
     - `RootComponent → Cn`
     - `RootComponent → IsAuthenticated`

## 改动文件

- `web/src/routes/__root.tsx`
- `web/src/components/app-sidebar.tsx`
- `web/src/components/app-header.tsx`
- `web/src/components/page-header.tsx`

## 自审

- 未修改业务页面、路由目标、API、auth 流程或测试文件。
- 保留了 `RootComponent` 的 page view logging 逻辑。
- 保留了 `AppHeader` 的 `clearToken()` + `navigate({ to: '/login' })` 退出行为。
- Sidebar 的移动端遮罩、关闭按钮和 `onMobileClose` 行为保持一致。
- `PageHeader` 外部 props 未改动。

## 疑虑 / 备注

- `web/src/routeTree.gen.ts` 在 `git status` 中显示为已修改，但 `git diff` 无内容，推测是本地换行符或工具触碰导致；本次未将其纳入提交。
