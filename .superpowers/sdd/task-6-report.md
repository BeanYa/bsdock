## Task 6 Report

### 实现内容
- 重设计 `web/src/routes/login.tsx`，将左侧改为 command center access gate 叙事与 capability rows，右侧登录卡片改为更强的 control-plane 入口样式。
- 保留 `api.login`、`setToken`、成功后跳转 `/nodes`、`loading` 文案和 toast 成功/失败行为。
- 保留移动端品牌露出，在登录表单上方继续展示 BSDock 身份信息。
- 重设计 `web/src/routes/logs/index.tsx`，将日志源切换改为 segmented control，同时保留 `useLogs(source)`、`LogSource` 的 `runtime` / `request` 值。
- 保留连接状态文案 `已连接` / `未连接`，并将错误信息以内联方式展示在状态栏。
- 重设计 `web/src/components/log-viewer.tsx`，改为 full-height terminal panel，保留自动滚动、解锁滚动与“回到底部”行为。
- 更新 `web/src/components/log-line.tsx`，保留 level/source 解析，同时增强时间戳与 source pill 的对比度和可扫描性。

### GitNexus 影响分析
- `LoginPage`: `impact` 结果为 LOW，未发现上游依赖；关联流程 `LoginPage → Cn`。
- `LogViewer`: `impact` 结果为 LOW，未发现上游依赖；关联流程 `LogViewer → Cn`。
- `LogLine`: `impact` 结果为 LOW，直接影响 `LogViewer` 1 处。
- `LogsPage`: 当前 GitNexus 索引未命中该符号名；已结合目标文件内容与相关上下文确认改动范围仅在 `web/src/routes/logs/index.tsx` 内。
- `detect-changes`: 结果为 medium，涉及两条预期流程：`LogViewer → Cn`、`LoginPage → Cn`。

### 测试命令与结果
- `cd web && rtk bun run typecheck`
  - 结果：通过
- `cd web && rtk bun run test`
  - 结果：通过，17 个测试文件、85 个测试全部通过

### 改动文件
- `web/src/routes/login.tsx`
- `web/src/routes/logs/index.tsx`
- `web/src/components/log-viewer.tsx`
- `web/src/components/log-line.tsx`
- `.superpowers/sdd/task-6-report.md`

### 自审
- 未改动首页、节点列表、节点详情。
- 未新增依赖，未修改 API contract。
- 保留了登录核心流程、日志 hook 使用方式和连接状态文案。
- 未引入 `transition-colors`、`transition-all`、`transition-shadow`、`transition-[width]`、`transition-[height]`、`transition-[padding]` 等非允许属性。
- 当前仓库不存在 `web/src/components/log-viewer.test.tsx`，因此未更新相关测试文件。

### 疑虑
- GitNexus 当前对 `LogsPage` 的符号检索未命中，报告中已注明并通过文件级核对补足范围确认。
