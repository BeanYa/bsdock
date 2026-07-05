# Nodes 页面卡片式布局设计

## 概述

将 `web/src/routes/nodes/index.tsx` 中的 Nodes 列表从表格（Table）展示改为响应式卡片网格展示，使节点信息更直观、更易于在视觉上快速识别状态。

## 当前问题

当前 Nodes 页面使用 `Table` 组件展示节点：

- 表格在小屏设备上横向滚动体验较差。
- 视觉层次较弱，状态不够醒目。
- 节点数量较多时，行与行之间辨识度不高。

## 变更方案

### 前端

1. **替换表格为卡片网格**
   - 移除 `web/src/routes/nodes/index.tsx` 中的 `Table`、`TableHeader`、`TableBody`、`TableRow`、`TableCell`、`TableHead` 组件。
   - 使用 `Card`、`CardContent`、`CardHeader`、`CardTitle` 等 shadcn/ui 卡片组件构建网格项。
   - 卡片内部展示：节点名称（`name`）、状态徽章（`StatusBadge`）、操作菜单（DropdownMenu）。

2. **响应式网格**
   - 使用 Tailwind CSS Grid 工具类实现响应式列数：
     - 小屏（默认）：1 列
     - 中屏（`sm:`）：2 列
     - 大屏（`lg:`）：3 列
     - 超大屏（`xl:`）：4 列

3. **保留现有交互**
   - 保留搜索框和状态筛选器。
   - 保留 "New Node" 创建弹窗。
   - 保留操作菜单中的 "Install Command"、"Rotate Token" 和 "View Details"。
   - 保留底部安装命令展示弹窗。

4. **加载与空状态**
   - 加载状态使用卡片骨架屏（Skeleton）替代表格骨架行。
   - 无节点时继续使用 `EmptyState` 组件。

## 数据结构

Node 数据类型保持不变：

```ts
type Node = {
  id: string
  name: string
  status: 'pending' | 'online' | 'offline'
  platform?: string
  system_info?: Record<string, unknown>
  last_seen_at?: string
  created_at: string
}
```

## UI 设计

### 卡片内容

每张卡片包含：

- **标题区**：节点名称（`CardTitle`）。
- **内容区**：状态徽章（`StatusBadge`）。
- **操作区**：下拉菜单按钮，包含：
  - Install Command
  - Rotate Token
  - View Details

### 布局示例

```
+--------------------------------------------------+
| Nodes                        [+ New Node]        |
+--------------------------------------------------+
| [Search nodes...] [All Status ▼]                 |
+--------------------------------------------------+
| +---------------+ +---------------+ +----------+ |
| | production-01 | | staging-02    | | edge-01  | |
| | [online]      | | [offline]     | | [pending]| |
| |      ⋮        | |      ⋮        | |     ⋮    | |
| +---------------+ +---------------+ +----------+ |
| +---------------+ +---------------+              |
| | web-01        | | db-01         |              |
| | [online]      | | [online]      |              |
| |      ⋮        | |      ⋮        |              |
| +---------------+ +---------------+              |
+--------------------------------------------------+
```

## 错误处理

- 保留现有错误处理逻辑，包括创建节点失败、生成安装命令失败时的 Toast 提示。
- 卡片操作菜单继续使用现有的 `handleShowInstallCommand` 处理函数。

## 测试

- 前端：运行 `cd web && bun run test` 确保现有测试通过。
- 手动验证：在不同屏幕尺寸下检查卡片网格响应式表现、搜索筛选、操作菜单和弹窗行为。
