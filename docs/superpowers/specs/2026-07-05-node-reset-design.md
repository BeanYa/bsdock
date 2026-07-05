# Node Reset 功能设计

## 概述

为已在线（`online`）的节点提供 Reset 功能：生成新的安装 Token、将节点状态重置为 `pending`、使原 Token 失效，同时保留已有的 `system_info` 和 `last_seen_at` 数据，以便复用节点记录。

## 背景

当前系统已支持 Token 轮换（`POST /api/v1/nodes/{id}/rotate-token`），但该接口仅更新 `token_hash` 和 `token_used`，不改变节点状态。用户希望对于 `online` 节点：

- 隐藏 "Install Command" 操作，避免再次展示已使用过的安装命令。
- 提供 "Reset" 操作，重新生成 Token 并将状态置为 `pending`。
- 原 Token 因 `token_hash` 被替换而自然失效。

## 变更方案

### 后端

1. **新增 Reset 接口**
   - 路由：`POST /api/v1/nodes/{id}/reset`。
   - 处理函数放在 `panel/internal/api/nodes.go` 的 `NodesHandler` 中。

2. **新增 Service 方法 `Reset`**
   - 文件：`panel/internal/node/node.go`。
   - 行为：
     - 校验节点存在。
     - 调用 `auth.GenerateInstallToken` 生成新 Token。
     - 计算新 Token 的 SHA256 Hash。
     - 更新节点：`token_hash = 新 Hash`、`token_used = FALSE`、`status = 'pending'`。
     - 保留 `system_info` 和 `last_seen_at` 不变。

3. **新增 SQL 查询 `ResetNode`**
   - 文件：`panel/internal/db/queries.sql`。
   - 生成代码：`panel/internal/db/queries.sql.go`（由 `sqlc generate` 生成）。

### 前端

1. **API 客户端新增 `resetNode`**
   - 文件：`web/src/lib/api.ts`。
   - 方法：`resetNode(id: string) → POST /nodes/${id}/reset`，返回 `{ install_command }`。

2. **操作菜单按状态区分**
   - 文件：`web/src/routes/nodes/index.tsx`。
   - `online` 节点：隐藏 "Install Command"，显示 "Reset"。
   - `pending` / `offline` 节点：显示 "Install Command"（原 Rotate Token 入口）。

3. **Reset 成功后展示安装命令**
   - 复用现有的安装命令展示弹窗和 `handleShowInstallCommand` 处理逻辑。
   - Reset 成功后后端返回新的安装命令，前端弹窗展示。

## 数据流

```
用户点击 online 节点的 "Reset"
  → 前端 POST /api/v1/nodes/{id}/reset
    → NodesHandler.Reset
      → node.Service.Reset
        → GenerateInstallToken
        → ResetNode（更新 token_hash、token_used=FALSE、status=pending）
        → buildInstallCommand
      → 返回 { install_command }
  → 前端展示新的安装命令
  → 节点状态更新为 pending（通过 WebSocket 广播或后续轮询刷新）
```

## 原 Token 失效机制

Agent 连接或上报时，后端会校验请求 Token 的 SHA256 Hash 是否与节点存储的 `token_hash` 一致。Reset 操作会重写 `token_hash`，因此原 Token 的 Hash 不再匹配，任何使用原 Token 的 Agent 都会收到 401 Unauthorized，实现失效效果。

## 错误处理

- **节点不存在**：返回 404。
- **生成 Token 失败**：返回 500。
- **Reset 失败**：前端显示错误 Toast，不替换当前安装命令。

## 测试

- 后端：新增 `NodesHandler.Reset` 测试和 `node.Service.Reset` 测试，验证：
  - 节点状态被重置为 `pending`。
  - `token_hash` 被更新，`token_used` 为 `FALSE`。
  - 原 Token 无法通过认证。
- 前端：更新 `web/tests/e2e/layout.spec.ts`，验证 online 节点显示 "Reset" 菜单项，点击后生成新的安装命令。
