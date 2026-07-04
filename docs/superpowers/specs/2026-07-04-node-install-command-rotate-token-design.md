# Node 安装命令显示、Token 轮换与心跳稳定性设计

## 概述

本设计解决用户反馈的三个问题：

1. Node 的安装命令仅在创建完成后显示一次，后续无法查看，也无法在 UI 上轮换安装 Token。
2. Agent 安装/运行期间没有日志输出。
3. Node 在 `online` 与 `offline` 之间循环切换，WebSocket 断连后立即被标记为 offline。

## 问题分析

### 问题 1：安装命令一次性显示

- `web/src/routes/nodes/index.tsx` 仅在创建弹窗内、且 `installCommand` 状态非空时显示安装命令。
- 关闭弹窗后命令被清空，用户无法再次查看。
- UI 上没有任何入口可以重新生成安装命令或轮换 Token。

**重要限制**：Panel 只存储 Token 的 SHA256 哈希（`token_hash`），不存储原始 Token。因此无法直接“显示之前的安装命令”。任何“显示安装命令”的操作本质上都需要生成一个新的 Token 和新的安装命令。

### 问题 2：Agent 缺少日志

- `agent/cmd/agent/main.go` 只在传输失败时打印 `transport error: ...`。
- 三种传输模式（WebSocket / HTTP / Pull）在成功连接或正常运行期间均不输出日志。
- Panel 侧也只在错误路径打印日志。

用户补充要求：安装日志与运行日志均写入同一个文件，文件大小 2MB 滚动窗口，日志文件与 Agent 二进制文件放在同一目录。

### 问题 3：online/offline 循环

- `panel/internal/api/agent_ws.go:89` 在 WebSocket 读循环退出时立即将节点状态改为 `offline`。
- Agent 断线后会立即重连，或 fallback 到 HTTP / Pull 模式，从而再次将节点标记为 `online`。
- 心跳检测器（`panel/internal/api/heartbeat.go`）已经会根据 `last_seen_at` 在超时（默认 60s）后自动标记 `offline`，因此 WebSocket 断连时立即 offline 是多余的，并且与重连逻辑形成竞争，导致状态循环。

## 变更方案

### 后端

1. **校验安装 Token Hash**
   - 当前 `token_hash` 字段仅被写入，从未校验。
   - 在 `AgentWSHandler.Handle` 与 `AgentHTTPHandler.handle` 中，解析 JWT 后计算 `sha256(token)`，并与节点存储的 `token_hash` 比较。
   - 这样 Token 轮换才有意义：旧 Token 不再匹配更新后的 Hash，会被拒绝。

2. **新增 `platform` 字段**
   - 在 `nodes` 表中新增 `platform TEXT NOT NULL DEFAULT 'linux'`。
   - 创建 Node 时保存平台。
   - 轮换 Token 时无需前端再次提供平台，后端可直接使用节点存储的平台生成安装命令。

3. **新增 Rotate Token 接口**
   - 路由：`POST /api/v1/nodes/{id}/rotate-token`。
   - 处理函数放在 `panel/internal/api/nodes.go`。
   - 生成新的安装 Token（`auth.GenerateInstallToken`）。
   - 更新节点：`token_hash = sha256(newToken)`，`token_used = FALSE`。
   - 返回新的安装命令（`buildInstallCommand(node.platform, panelURL, newToken)`）。
   - 新增 SQL 查询：`RotateInstallToken`。

4. **移除 WebSocket 断连时的立即 offline**
   - 删除 `panel/internal/api/agent_ws.go` 读循环退出后的 `UpdateNodeStatus(offline)`。
   - 断开时不再广播 `node_update`（因为状态没有立即变化）。
   - 由心跳检测器在超时后统一将节点标记为 offline。

5. **Panel 侧安装成功日志**
   - `AgentWSHandler.Handle` 中首次将 Token 标记为已使用并设置为 online 后，打印：
     `log.Printf("node %s installed and online via websocket", nodeID)`
   - `AgentHTTPHandler.handle` 中，事务提交后如果 Token 之前未使用，打印：
     `log.Printf("node %s installed and online via http", claims.NodeID)`

### Agent

1. **日志输出到文件（2MB 滚动）**
   - 在 `agent/cmd/agent/main.go` 中实现或引入一个按大小滚动的文件写入器（`RotatingFileWriter`）。
   - 日志文件路径为 Agent 二进制所在目录下的 `agent.log`。
   - 单个文件上限 2MB，超过后重命名为 `agent.log.old` 并创建新文件。
   - 日志文件权限设置为 `0600`，避免其他用户读取。
   - 通过 `log.SetOutput` 将标准日志输出重定向到该文件。
   - 如果日志文件无法创建（如二进制目录只读），Agent 回退到标准错误输出继续运行，而不是直接退出。

2. **安装/连接成功日志**
   - `agent/internal/transport/ws.go`：WebSocket 初始注册成功后打印 `agent connected to panel via websocket: <url>`。
   - `agent/internal/transport/http.go`：首次 HTTP 上报成功后打印 `agent connected to panel via http: <url>`。
   - `agent/internal/transport/pull.go`：首次轮询成功后打印 `agent connected to panel via pull: <url>`。

3. **运行日志**
   - 在心跳/上报循环中输出运行日志，便于追踪 Agent 是否仍在正常工作：
     - WebSocket 每次发送心跳后：`agent heartbeat sent via websocket`
     - HTTP 每次上报成功后：`agent report sent via http`
     - Pull 每次轮询成功后：`agent poll reported, next in <n>s`
   - 连接断开或发生错误时输出对应日志。

4. **修复 Pull 模式响应体处理**
   - `agent/internal/transport/pull.go` 中当前先 `resp.Body.Close()` 再解码 JSON，导致 `next_report_seconds` 始终为 0。
   - 将 `defer resp.Body.Close()` 提前，确保解码后再关闭。

### 前端

1. **Node 详情页（`web/src/routes/nodes/$nodeId.tsx`）**
   - 新增 "Install Command" 卡片。
   - 由于无法显示历史 Token，默认显示提示文本："安装命令已隐藏，点击下方按钮生成新的安装命令"。
   - 提供 "Rotate Token / 生成安装命令" 按钮，点击后调用后端接口，成功后用新的安装命令替换提示文本，并显示 Copy 按钮。

2. **API 客户端（`web/src/lib/api.ts`）**
   - 新增 `rotateToken(id)` → `POST /nodes/${id}/rotate-token`，返回 `{ install_command }`。

3. **Node 列表（`web/src/routes/nodes/index.tsx`）**
   - 每行增加操作下拉菜单，包含 "Install Command" 和 "Rotate Token" 两项。
   - 选择后弹出对话框显示新的安装命令（因为历史命令无法恢复，选择即生成新命令）。

## 数据流

### 轮换 Token

```
用户点击 "Rotate Token"
  → 前端 POST /api/v1/nodes/{id}/rotate-token
    → NodesHandler.RotateToken
      → node.Service.RotateToken
        → GenerateInstallToken
        → RotateInstallToken（更新 token_hash、token_used=false）
        → buildInstallCommand(node.platform, panelURL, newToken)
      → 返回 { install_command }
  → 前端显示新的安装命令
```

### Agent 认证（更新后）

**WebSocket 初始连接**

```
Agent 携带 Token 连接
  → ParseInstallToken
  → GetNode
  → 若 sha256(token) != node.token_hash → 拒绝
  → 若 token_used 为 true → 拒绝（安装 Token 单次使用）
  → MarkInstallTokenUsed + UpdateNodeStatus(online)
```

**HTTP / Poll 上报**

```
Agent 携带 Token 上报
  → ParseInstallToken
  → GetNode
  → 若 sha256(token) != node.token_hash → 拒绝（Token 已轮换/撤销）
  → 若 token_used 为 false → 标记已使用并输出安装成功日志
  → 更新系统信息与 last_seen_at
```

HTTP / Poll 模式需要持续使用同一 Token 上报，因此只校验 Hash，不拒绝 `token_used == true`。

### 状态转换（更新后）

```
WebSocket 连接      → online
WebSocket 心跳      → online，更新 last_seen_at
HTTP / Poll 上报     → online，更新 last_seen_at
心跳检测器超时       → offline
WebSocket 断连      → 不立即改变状态
```

## 错误处理

- **Token 轮换失败**：前端显示错误 Toast，不替换当前显示的安装命令。
- **Token Hash 不匹配**：Agent 收到 401，无法使用已轮换/撤销的 Token 注册。
- **上下文取消**：移除断连时的 DB 写操作后，不再存在 `r.Context()` 已取消导致 offline 更新失败的风险。

## 测试

- 后端：新增 `RotateToken` 测试、`agent_ws_test.go` 与 `agent_http_test.go` 中补充 Token Hash 校验用例、WebSocket 断连后状态行为测试。
- 前端：为详情页安装命令卡片与列表下拉操作添加组件测试。
- Agent：验证连接成功日志输出、Pull 模式 `next_report_seconds` 解码、日志文件滚动行为。
