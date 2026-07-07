# NodeCard 信息密度增强设计

## 背景

当前 `/nodes` 列表页中的 `NodeCard` 信息密度较低：资源状态仅以文字快照呈现，安装命令 / Reset 操作隐藏在下拉菜单中，Disk 指标也未展示。用户提供的草图明确要求：

- 三个圆形仪表展示 CPU / MEM / Disk 使用率
- 平台与主 IP 外露
- 底部直接展示「install command」与「reset」操作

## 目标

在不改变现有暗色系统风格的前提下，提升 `NodeCard` 的信息密度与操作可达性，使其一眼即可判断节点资源健康状态并执行常用操作。

## 设计决策

### 主题定位

产品是 Panel-Node 管理平台，目标用户是运维/开发者。卡片需要传递「机器状态」而不是「营销感」。因此设计保持工业、紧凑、数据优先，而非大图或柔和装饰。

### 色彩系统（沿用现有 + 补充）

| Token | 值 | 用途 |
|-------|-----|------|
| `bg-card` | `#1F2833` | 卡片背景 |
| `border-card` | `#2A3546` | 卡片边框、轨道 |
| `bg-deep` | `#0B0C10` | 平台徽章、仪表底色 |
| `text-primary` | `#C5C6C7` | 主文字、节点名、百分比 |
| `text-muted` | `#8892A0` | 标签、次文字 |
| `status-ok` | `#39FF14` | 健康 / online / < 70% |
| `status-warn` | `#FFC107` | 警告 / 70%-89% |
| `status-danger` | `#FF4D4D` | 危险 / ≥ 90% / pending |
| `accent-cyan` | `#00F0FF` | 安装命令高亮 |

### 字体

- 节点名：`text-base font-semibold tracking-tight`
- 状态/标签：`text-xs font-mono uppercase tracking-wider`
- 圆环中央百分比：`text-sm font-mono font-semibold`
- 操作按钮：`text-sm`

### 布局

```
┌─────────────────────────────────────┐
│  ●  node-name               [online]│
│        last seen 2m ago             │
│  LINUX        10.0.0.4              │
│                                     │
│   ┌───┐   ┌───┐   ┌───┐             │
│   │CPU│   │MEM│   │DISK│            │
│   │ 12│   │ 45│   │ 67│   %         │
│   └───┘   └───┘   └───┘             │
│                                     │
│  [👁 install command]    [↻ reset]   │
└─────────────────────────────────────┘
```

1. 顶部：节点名（截断 + title）、状态徽章、最后在线时间
2. 第二行：平台徽章 + 主 IP
3. 中部：三个等径圆环仪表
4. 底部：外露操作区

### 圆环仪表规格

- 尺寸：桌面 `56px`，移动端 `48px`
- 描边：`stroke-width="6"`
- 轨道色：`#2A3546`
- 填充色按使用率阈值切换：`< 70%` 绿 / `70%-89%` 琥珀 / `≥ 90%` 红
- 无数据时圆环为灰色轨道，中央显示 `—`
- 使用 SVG `<circle>` 的 `stroke-dasharray` + `stroke-dashoffset` 实现，无需额外依赖

### 操作区行为

| 节点状态 | 左侧按钮 | 右侧按钮 |
|----------|----------|----------|
| `online` | 「Install Command」（眼睛图标）触发 `handleShowInstallCommand` | 「Reset」（回转箭头）触发 `handleReset` |
| `offline` / `pending` | 「Install Command」（眼睛图标）高亮显示，触发 `handleShowInstallCommand` | 「Reset」禁用或隐藏（后端 reset 通常针对在线节点） |

保留平台徽章与主 IP 外露，删除现有下拉菜单（MoreHorizontal）。

### 数据映射

- CPU：`system_info.cpu_percent`（number，0-100）
- MEM：`(system_info.memory_total - system_info.memory_free) / system_info.memory_total`
- Disk：`(system_info.disk_total - system_info.disk_free) / system_info.disk_total`

所有计算函数放在 `NodeCard` 内，并对 `NaN`、零除、缺失字段做防御。

### 响应式

- 网格保持现有 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- 卡片内部使用 flex 自适应，圆环在 `sm` 以下自动缩小
- 操作按钮在小屏下允许换行

### 可访问性

- 圆环使用 `role="img"` + `aria-label` 描述当前指标与数值
- 操作按钮保持可见 focus 环
- 保留 `prefers-reduced-motion`：仪表加载动画在 reduced motion 下禁用

## 待修改文件

- `web/src/components/node-card.tsx`：重构卡片布局与逻辑
- `web/src/components/node-card.test.tsx`：更新/补充测试用例
- 可能新增辅助组件：`web/src/components/resource-ring.tsx`（可选，若圆环复用则提取）

## 风险

- 删除下拉菜单会改变现有交互习惯，但草图明确要求外露操作
- 新增 Disk 指标依赖 `system_info.disk_total/disk_free`，需确保 agent 上报字段稳定（当前代码已支持）
