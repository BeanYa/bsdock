# Task 1 Report: Global Design Tokens And Surface Utilities

## 实现内容

1. 在 `web/src/index.css` 中将 `:root` 与 `.dark` 的全局 design token 更新为任务简报要求的 Command Center 调色板，包括 `--background`、`--foreground`、`--card`、`--primary`、`--border`、`--radius` 等变量。
2. 保留 `@tailwind base/components/utilities`，并补充稳定的 surface utility：
   - `.glass`
   - `.glass-hover`
   - `.command-surface`
   - `.command-grid`
   - `.ambient-light`
   - `.status-pulse`
3. 保留并确认 reduced-motion 兜底：
   - `@media (prefers-reduced-motion: reduce)` 下禁用 `.ambient-light` 和 `.status-pulse` 动画。
   - `@media (prefers-reduced-transparency: reduce)` 下保留透明度降级表现。
4. 在 `web/tailwind.config.ts` 中保持现有 color key 不变，仅将 `fontFamily.sans` 调整为更稳妥的 sans fallback，并保留 `Maple Mono CN` 与现有 `fontFamily.mono`。

## GitNexus / 风险评估

1. 按 brief 先执行：
   - `rtk node .gitnexus/run.cjs impact index.css --upstream`
   - `rtk node .gitnexus/run.cjs impact tailwind.config.ts --upstream`
2. 当前 worktree 内不存在 `.gitnexus/run.cjs`，因此改用仓库根目录入口：
   - `rtk node C:\universe\workspace\repo\bsdock\.gitnexus\run.cjs ...`
3. 先发现索引 stale，于是执行：
   - `rtk node C:\universe\workspace\repo\bsdock\.gitnexus\run.cjs analyze`
4. 重新分析后，GitNexus 对 `index.css` / `tailwind.config.ts` 这类非符号 CSS/config 目标无法直接解析 caller 图，因此没有得到传统函数级 blast radius。
5. 结合作用面评估，本次改动仅影响：
   - 全局样式 token
   - Tailwind 主题字体 fallback
   - 由这些 utility class 消费的前端视觉表现
6. 后续执行：
   - `rtk node C:\universe\workspace\repo\bsdock\.gitnexus\run.cjs detect-changes --scope unstaged --repo "C:\universe\workspace\repo\bsdock\.worktrees\command-center-redesign"`
   - `rtk node C:\universe\workspace\repo\bsdock\.gitnexus\run.cjs detect-changes --scope staged --repo "C:\universe\workspace\repo\bsdock\.worktrees\command-center-redesign"`
7. `detect-changes` 结果：
   - `Changes: 4 files, 2 symbols`
   - `Affected processes: 0`
   - `Risk level: low`
   - 输出中的 symbol 指向现有已改动的 `AGENTS.md` / `CLAUDE.md`，CSS/config 未被建模为 symbol。
   - 对仅 stage 的 `web/src/index.css` 与 `web/tailwind.config.ts`，结果为 `No changes detected.`，同样说明这两类文件没有被当前索引映射成 symbol 变更。

## 测试命令与结果

1. `cd web && rtk bun run typecheck`
   - 结果：PASS
   - 输出：`$ tsc --noEmit`

## 改动文件

- `web/src/index.css`
- `web/tailwind.config.ts`

## 自审

1. 只修改了任务允许的源码文件，没有碰其他源码。
2. `tailwind.config.ts` 的 color key、darkMode、plugins 均保持不变。
3. `Maple Mono CN` 没有被移除，`mono` 字体栈保持原样。
4. `command-surface`、`command-grid` 已按 brief 中给定值落地。
5. `.ambient-light` 与 `.status-pulse` 的 reduced-motion fallback 仍然存在。

## 疑虑

1. GitNexus 当前版本对 CSS/config 文件不能像函数或组件那样直接做 symbol impact；本次风险结论主要来自索引状态、`detect-changes` 结果和改动范围本身。
2. 当前 worktree 已存在其他未由我产生的修改（如 `AGENTS.md`、`CLAUDE.md`、`.claude/skills/...`），我未还原也未纳入本任务提交。

## Fix Report

### 修复内容

1. 在 `web/src/index.css` 中将 `.glass-hover` 的 transition 从 `border-color`、`box-shadow`、`transform` 收敛为仅 `transform` 与 `opacity`。
2. 保留 `.glass-hover:hover` 的边框和阴影 hover 视觉，但这些样式现在是即时切换，不再参与动画；额外使用轻微 `opacity` 变化配合 `transform` 表达 hover motion。
3. 将 `@keyframes status-pulse` 从动画 `box-shadow` 改为仅动画 `opacity` 与 `transform: scale(...)`。
4. 在 `@media (prefers-reduced-motion: reduce)` 下补充 `.glass-hover` 的静态回退，并继续禁用 `.status-pulse` / `.ambient-light` 动画。

### 测试命令与结果

1. `cd web && rtk bun run typecheck`
   - 结果：PASS
   - 输出：`$ tsc --noEmit`

2. `rtk node C:\universe\workspace\repo\bsdock\.gitnexus\run.cjs impact index.css --direction upstream --summary-only --repo bsdock`
   - 结果：PASS
   - 风险：`LOW`
   - 摘要：`direct=0, processes_affected=0, modules_affected=0`
