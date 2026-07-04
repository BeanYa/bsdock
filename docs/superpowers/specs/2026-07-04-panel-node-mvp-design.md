# Panel-Node MVP 设计文档

> 版本：v1.0  
> 日期：2026-07-04  
> 状态：待实现计划
>
> **设计变更说明**：
> 1. 原始需求中前端框架为 React + Next.js，经确认后切换为 **Vite + React**，以配合 `bun + vite` 的构建方式。
> 2. 架构目标对齐 [miaomiaowuX](https://github.com/iluobei/miaomiaowuX) 的「主控 + SubAgent」架构：单二进制部署、Agent 多模式回连、标准库后端、TanStack Router、modernc.org/sqlite。

## 1. 项目目标

构建一个主从架构的服务器管理面板 MVP，实现：

1. 用户登录 Panel；
2. 创建 Node 后生成一键安装命令；
3. 在目标服务器执行安装命令后 Agent 自动激活；
4. Agent 上报系统信息，Panel 实时显示 Node 状态与详情。

## 2. 架构概览

```
┌─────────────────┐      HTTP / WebSocket      ┌──────────────────┐
│  Panel-Frontend │  ◄──────────────────────►  │  Panel-Backend   │
│  (Vite + React) │                            │  (Go + SQLite)   │
└─────────────────┘                            └────────┬─────────┘
                                                        │ WebSocket / HTTP / Pull
                                                        │   (auto fallback)
                                                        ▼
                                               ┌──────────────────┐
                                               │   Node Agent     │
                                               │  (Go 静态二进制)  │
                                               └──────────────────┘
```

- **Panel-Frontend**：Vite + React + TypeScript，由 Panel-Backend 在运行时托管静态产物，或开发时通过 Vite dev server 独立运行。
- **Panel-Backend**：Go（标准库 net/http）提供 HTTP API、WebSocket 服务、Pull 拉取端点，使用 SQLite 持久化。
- **Agent**：Go 编译为 linux/amd64 与 linux/arm64 静态二进制，运行在 Node 上，主动向 Panel-Backend 建立连接；支持 WebSocket / HTTP / Pull 三种模式，默认 `auto` 按可用性自动回退。
- **Install Script**：固定脚本 `scripts/install-agent.sh` 托管于 GitHub Raw，通过 `--panel` 与 `--token` 参数接收面板地址和注册令牌。

## 3. 技术栈

### 3.1 前端

- **构建工具**：Vite 6+
- **框架**：React 19+（函数组件 + Hooks）
- **路由**：TanStack Router
- **语言**：TypeScript 5+
- **样式**：Tailwind CSS 4+
- **组件库**：shadcn/ui
- **主题**：next-themes（深浅主题，默认深色）
- **包管理器**：bun
- **测试**：Vitest + React Testing Library + Playwright

### 3.2 后端

- **语言**：Go 1.24+
- **Web 框架**：标准库 `net/http` + `gorilla/mux`（路由）
- **数据库**：SQLite 3（文件型），驱动使用 **modernc.org/sqlite**（纯 Go，无 CGO）
- **数据库访问**：database/sql + sqlc（类型安全查询）
- **WebSocket**：gorilla/websocket
- **认证**：golang-jwt + bcrypt
- **配置**：`config.yaml` + 环境变量覆盖
- **测试**：Go 标准 testing + testify

### 3.3 Agent

- **语言**：Go 1.24+
- **连接模式**：WebSocket / HTTP / Pull，默认 `auto` 自动回退
- **WebSocket 客户端**：gorilla/websocket
- **系统信息**：gopsutil
- **构建**：交叉编译为静态二进制（CGO_ENABLED=0）

## 4. 项目结构

```
bsdock/
├── .github/workflows/          # GitHub Actions：构建与 Release
├── agent/                      # Go Agent 源码
│   ├── cmd/agent/main.go
│   ├── internal/
│   │   ├── collector/          # 系统信息采集
│   │   ├── register/           # 注册与 WebSocket 连接
│   │   └── heartbeat/          # 心跳
│   └── agent_test.go
├── panel/                      # Go Panel-Backend 源码
│   ├── cmd/panel/main.go
│   ├── internal/
│   │   ├── api/                # HTTP API handler
│   │   ├── auth/               # JWT / bcrypt
│   │   ├── db/                 # sqlc 生成的查询 + schema
│   │   ├── node/               # Node 领域逻辑
│   │   ├── websocket/          # 前后端与 Agent 的 WS
│   │   └── static/             # 前端静态产物 embed
│   └── migrations/
├── scripts/
│   ├── install-agent.sh        # Linux Agent 安装脚本（GitHub Raw 固定地址）
│   ├── install-panel.sh        # Linux 面板一键部署脚本（systemd + 初始化）
│   └── install.ps1             # Windows 面板一键部署脚本（可选）
├── web/                        # Vite + React 前端
│   ├── src/
│   │   ├── components/ui/      # shadcn 组件
│   │   ├── pages/              # Login / Nodes / NodeDetail
│   │   ├── hooks/              # useWebSocket、useNodes 等
│   │   ├── services/           # API 调用
│   │   └── store/              # Zustand 全局状态
│   └── tests/
├── docs/
│   └── superpowers/
│       ├── specs/              # 设计文档
│       └── plans/              # 实现计划
├── package.json                # bun scripts：dev/build/test/e2e
├── bun.lockb
├── config.yaml                 # 主控默认配置文件
├── go.mod
├── go.sum
├── Taskfile.yml                # 开发任务（替代 Makefile）
└── README.md
```

## 5. 认证与安全

### 5.1 用户认证

- MVP 仅支持单管理员账号，首次启动时通过环境变量 `BSDOCK_ADMIN_USERNAME` 与 `BSDOCK_ADMIN_PASSWORD` 创建；若环境变量未设置，后端启动失败并提示配置。
- 密码使用 bcrypt 哈希存储于 `users` 表。
- 登录成功后后端返回 JWT（Access Token），有效期 24 小时，前端存储于 `Authorization` Header。
- 所有 `/api/v1/*` 接口（除登录、Agent 注册入口外）需校验 JWT。

### 5.2 Agent 注册令牌

- 创建 Node 时生成一次性短期 JWT（install token），包含 `node_id`、签发时间、过期时间（默认 24 小时）。
- 令牌仅用于 Agent 首次注册（WebSocket、HTTP 或 Pull 任一模式）；后端验证签名与有效期、解析出 `node_id` 后，立即将该 token 标记为已使用，不可再次注册。
- 安装命令示例：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/scripts/install-agent.sh) \
  --panel https://panel.example.com \
  --token <install_token>
```

### 5.3 传输安全

- 生产环境 Panel-Backend 必须启用 HTTPS（通过 Caddy/Nginx 反向代理或内置 TLS）。
- Agent 与后端通信默认使用 WSS（WebSocket Secure）；WSS 不可用时，仅在 Agent 明确传入 `--insecure` 模式下才允许回退到 WS。
- 面板管理接口强制 HTTPS，拒绝明文 HTTP 访问管理端点（开发环境可关闭）。

### 5.4 配置文件

- 主控配置文件为 `config.yaml`，默认位于工作目录；关键配置项可通过环境变量覆盖。
- 示例配置：

```yaml
mode: master                 # master 模式（MVP 仅支持主控）
port: "8080"                 # HTTP 监听端口
database:
  path: "./panel.db"         # SQLite 文件路径
jwt:
  secret: ""                 # JWT 签名密钥，未设置时读取环境变量 BSDOCK_JWT_SECRET
  expire_hours: 24
admin:
  username: ""               # 未设置时读取 BSDOCK_ADMIN_USERNAME
  password: ""               # 未设置时读取 BSDOCK_ADMIN_PASSWORD
agent:
  allowed_modes: ["websocket", "http", "pull"]
  default_mode: "auto"       # auto | websocket | http | pull
  heartbeat_timeout_seconds: 60
  install_token_expire_hours: 24
log:
  level: info
```

## 6. Node 生命周期

```
创建 Node -> pending -> Agent 注册 -> online -> 心跳超时 -> offline
```

1. **创建**：用户在 Panel-Frontend 点击“新建 Node”，填写名称，后端生成 `node_id`、`install_token`，状态为 `pending`。
2. **等待安装**：前端显示一键安装命令，用户复制到目标服务器执行。
3. **安装**：`install-agent.sh` 下载对应架构的 Agent 二进制，写入 `/opt/bsdock-agent/`，注册 systemd service（或 nohup 后台），启动 Agent。
4. **注册**：Agent 携带 token 回连主控；`auto` 模式回退顺序为 WebSocket → HTTP → Pull。WebSocket 成功则保持长连接；失败时改用 HTTP 周期性上报；再失败则进入 Pull 模式，由 Agent 主动拉取。注册成功后附带系统信息。
5. **在线**：后端验证 token 通过后，将 Node 状态改为 `online`，保存系统信息，向前端广播更新。
6. **心跳**：WebSocket 模式下 Agent 每 30 秒发送 `heartbeat` 消息；HTTP/Pull 模式下每次上报即视为心跳；后端超过 60 秒未收到任何模式上报则标记 `offline`。
7. **重连**：Agent 断线后自动重连，重连间隔 5s/10s/30s 指数退避。

## 7. Agent-Backend 协议

Agent 与后端支持三种连接模式，默认 `auto` 自动回退：

1. **WebSocket 模式**（优先）：Agent 作为 WebSocket 客户端连接 `/api/v1/agent/ws?token=...`，长连接实时推送。
2. **HTTP 模式**：WebSocket 不可用时，Agent 通过 `POST /api/v1/agent/report` 上报注册与心跳信息。
3. **Pull 模式**：Agent 无法主动连上主控时（如主控在 CDN/内网后），周期性 `POST /api/v1/agent/poll?token=...`，请求体携带当前系统信息，响应体返回 `ack` 与下次轮询间隔。

### 7.1 WebSocket 消息（Agent -> Backend）

```json
{
  "type": "register",
  "payload": {
    "token": "<install_token>",
    "hostname": "srv-01",
    "os": "linux",
    "arch": "amd64",
    "kernel": "6.5.0",
    "cpu_model": "Intel(R) Xeon",
    "cpu_cores": 4,
    "memory_total": 8589934592,
    "disk_total": 107374182400,
    "disk_free": 53687091200,
    "ips": ["192.168.1.10", "2001:db8::1"],
    "uptime": 3600
  }
}
```

```json
{ "type": "heartbeat", "timestamp": "2026-07-04T03:00:00Z" }
```

### 7.2 WebSocket 消息（Backend -> Agent）

```json
{ "type": "ack", "node_id": "uuid", "status": "online" }
```

### 7.3 HTTP / Pull 模式上报

当 Agent 使用 HTTP 模式时，请求体与 WebSocket `register` payload 一致；Pull 模式下请求体同样携带完整系统信息与心跳时间戳。后端在两种模式下均返回 JSON `ack`：

```json
{ "type": "ack", "node_id": "uuid", "status": "online", "next_report_seconds": 30 }
```

### 7.4 Backend -> Frontend

```json
{
  "type": "node_update",
  "payload": { "id": "uuid", "status": "online", "system_info": { ... } }
}
```

## 8. 前端界面

### 8.1 页面

- **/login**：管理员登录页。
- **/nodes**：Node 列表页，展示名称、状态、最后在线时间、安装命令一键复制。
- **/nodes/:id**：Node 详情页，实时展示系统信息卡片（CPU、内存、磁盘、网络、运行时间）。

### 8.2 主题

- 默认深色主题，支持 light/dark 切换，使用 next-themes 管理。
- shadcn/ui 组件统一风格，所有页面使用同一套颜色变量。

### 8.3 实时性

- 前端优先通过 `/api/v1/ws` 建立 WebSocket 接收 `node_update`；后端聚合 Agent 的 WebSocket / HTTP / Pull 上报后统一推送。
- WebSocket 不可用时（如 NAT/代理限制），自动回退到每 3 秒轮询 `/api/v1/nodes`。
- 列表页与详情页共享同一份节点数据，避免重复连接。

## 9. 数据库 Schema

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'online', 'offline')),
    token_hash TEXT NOT NULL,
    system_info TEXT, -- JSON
    last_seen_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE node_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    payload TEXT NOT NULL, -- JSON
    reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## 10. 构建与部署

### 10.1 开发环境（Windows 11 + WSL）

- 在 `package.json` 中定义 `bun run dev`：同时启动 Vite dev server（端口 5173）和 Go 后端（端口 8080），Vite 配置代理 `/api` 到后端。
- `bun run test`：运行前端单元测试。
- `go test ./...`：运行后端与 Agent 单元测试。

### 10.2 生产构建

- `bun run build`：构建前端静态产物到 `web/dist/`。
- Go 后端使用 `embed` 将 `web/dist` 打包进二进制。
- 使用 `package.json` scripts 调用 `go build` 交叉编译：
  - `bun run build:panel`：当前平台面板后端（已 embed 前端产物）。
  - `bun run build:agent:amd64` / `bun run build:agent:arm64`：Agent 静态二进制。
  - 可选 `Taskfile.yml` 作为跨平台任务封装。

### 10.3 部署方式

- **Linux VPS**：上传 `panel` 二进制、`config.yaml` 与 `scripts/install-panel.sh` 到服务器，执行 `install-panel.sh` 完成 systemd 注册、初始化数据库、启动服务。
- **GitHub Actions**：release tag 触发，自动构建所有二进制与前端产物，上传到 GitHub Release。
- **IPv6/NAT 兼容**：Agent 主动 outbound 连接后端，不依赖公网入站，适配 NAT 机器；后端绑定 `:8080` 同时监听 IPv4 与 IPv6；面板域名需具备 A 或 AAAA 记录，Agent 由操作系统 DNS 自动解析。

## 11. 测试策略

- **TDD**：每个 Task 先写测试再写实现。
- **后端单元测试**：auth、token、Node 状态机、WebSocket 消息处理。
- **Agent 单元测试**：系统信息采集、token 解析、消息编码。
- **前端单元测试**：组件渲染、hooks、API 调用。
- **E2E 测试（Playwright）**：登录 -> 创建 Node -> 复制安装命令 -> 模拟 Agent WebSocket 注册 -> 断言列表显示 Online -> 详情页展示系统信息。
- **可视化验收**：每个涉及前端的 Task 完成后启动 Playwright/CloakBrowser 进行可视化确认。

## 12. 边界与限制

- MVP 仅支持单管理员账号。
- Agent 仅支持 Linux（amd64 / arm64）。
- 面板与 Agent 部署在同一台机器时，通过 `localhost`/`127.0.0.1` 或 `--panel` 指定本地地址连接。
- 安装令牌一次性且 24 小时过期，过期后需重新生成。

## 13. 后续扩展（不在 MVP）

- 多用户与 RBAC。
- 命令下发与执行。
- Agent 日志收集。
- 文件同步。
- 告警与通知。
