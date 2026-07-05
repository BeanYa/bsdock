# Node 实时资源指标设计与实现

## 背景与问题

当前 BSDock 的 Agent 仅采集并上报静态系统信息，导致：

1. **Node 详情页 Memory 只显示上限**：`$nodeId.tsx` 使用 `memory_total - memory_free` 计算已用内存，但 `memory_free` 从未被采集和上报，结果 `memory_free` 为 `0`，显示为 `total / total`。
2. **Nodes 概况页 CPU/MEM 数据为空**：`node-card.tsx` 读取 `cpu_percent`、`memory_used`、`memory_free`，这些字段同样未采集/上报。
3. **无实时资源上报**：Agent 心跳包仅包含 token 和时间戳，没有运行时资源数据；Panel 收到心跳后只更新 `status`，不更新 `system_info`。

## 目标

- Agent 周期性采集并上报 CPU 使用率、内存已用/空闲量。
- Panel 接收运行时指标后合并到 `nodes.system_info`，并广播 `node_update` 给前端。
- Nodes 概况页与 Node 详情页均正确展示 CPU、MEM、Disk 使用率。
- Node 详情页新增资源环图（ResourceRing），与概况页风格统一。
- 兼容 WebSocket、HTTP、Pull 三种 Agent 传输模式。

## 方案选型

采用 **WebSocket 实时 + HTTP/Pull 兼容** 的混合方案：

- WebSocket：心跳消息升级为 `metrics` 消息，携带实时指标，Panel 更新并广播。
- HTTP/Pull：report 报文补充实时指标字段，Panel 在每次 report 时合并更新。
- 前端通过现有 `/ws` 通道即时刷新，无需新增轮询逻辑。

## 数据模型

在 `agent/internal/collector.SystemInfo` 中新增运行时字段：

```go
type SystemInfo struct {
    // 现有静态字段
    Hostname    string   `json:"hostname"`
    OS          string   `json:"os"`
    Arch        string   `json:"arch"`
    Kernel      string   `json:"kernel"`
    CPUModel    string   `json:"cpu_model"`
    CPUCores    int      `json:"cpu_cores"`
    MemoryTotal int64    `json:"memory_total"`
    DiskTotal   int64    `json:"disk_total"`
    DiskFree    int64    `json:"disk_free"`
    IPs         []string `json:"ips"`
    Uptime      uint64   `json:"uptime"`

    // 新增运行时字段
    CPUPercent  float64  `json:"cpu_percent"`
    MemoryUsed  int64    `json:"memory_used"`
    MemoryFree  int64    `json:"memory_free"`
}
```

Panel 的 `nodes.system_info` JSON 继续存储这些字段，不新增数据库列。

## Agent 采集

`collector.Collect()` 调用：

- `cpu.Percent(0, false)`：获取整体 CPU 使用率（percpu=false）。
- `mem.VirtualMemory()`：已调用，读取 `Used` 和 `Free`。

采集失败时该字段保持零值，不阻断整个上报流程。

## Agent 上报

### WebSocket

- `register` 消息：携带完整 `SystemInfo`（含新字段）。
- `metrics` 消息：替代原 `heartbeat`，字段为 `type`、`token`、`timestamp`、`cpu_percent`、`memory_used`、`memory_free`。

### HTTP

- `POST /api/v1/agent/report`：payload 增加 `cpu_percent`、`memory_used`、`memory_free`。
- 心跳同样 POST 到该 endpoint，`type` 为 `heartbeat` 时 Panel 只刷新状态。

### Pull

- `POST /api/v1/agent/poll`：复用 `buildReportPayload()`，自动携带新字段。

## Panel 接收

### WebSocket Handler (`panel/internal/api/agent_ws.go`)

- switch 增加 `case "metrics"`：
  - 解析 `cpu_percent`、`memory_used`、`memory_free`。
  - 读取当前 `system_info` JSON，合并运行时字段后写回。
  - 调用 `UpdateNodeStatus` 刷新 `last_seen_at`。
  - 调用 `broadcastNodeUpdate` 推送 `node_update`。

### HTTP Handler (`panel/internal/api/agent_http.go`)

- `agentReportPayload` 增加 `CPUPercent`、`MemoryUsed`、`MemoryFree`。
- 当 `payload.Type != "heartbeat"` 时，把三个字段合并到 `system_info`。
- 现有 `UpdateNodeSystemInfo` 写入完整 JSON。

## 前端展示

### Nodes 概况页 (`web/src/components/node-card.tsx`)

- 已有 `getCpuPercent`、`getMemoryPercent`、`getDiskPercent`，数据补齐后自然生效。
- 无需修改逻辑。

### Node 详情页 (`web/src/routes/nodes/$nodeId.tsx`)

- **Resources 区顶部新增三个 ResourceRing**：CPU、MEM、Disk，尺寸 `md`，布局居中。
- **ResourceCard 修正**：
  - Memory：使用 `memory_used / memory_total`。
  - Disk：保持 `disk_total - disk_free`。
- **移除冗余卡片**：删除单独的 "CPU Cores" InfoCard，CPU 核数并入 CPU ResourceCard 的副标题或保留在 Hardware 区。

## 实时刷新

前端 `useNode` 与 `useNodes` 已订阅 `/ws` 的 `node_update`，Panel 在 metrics 处理后广播，前端自动刷新，无需改动。

## 测试策略

- **Agent**：`collector_test.go` 断言 `CPUPercent` 在 `[0,100]`，`MemoryUsed/MemoryFree` 非负且和约等于 `MemoryTotal`。
- **Panel**：`agent_ws_test.go` 增加 `metrics` 消息测试；`agent_http_test.go` 增加含指标的 report 测试；断言 `system_info` 包含新字段并触发广播。
- **Web**：`node-card.test.tsx` 与 `nodes-page.test.tsx` 使用含 `cpu_percent`、`memory_used`、`memory_free` 的 mock 数据渲染；`$nodeId` 路由测试验证 ResourceRing 和 ResourceCard 显示正确。

## 验收标准

- [ ] Agent WebSocket 心跳改为 `metrics` 消息，每 30s 上报 CPU/MEM 数据。
- [ ] Agent HTTP/Pull report 携带 `cpu_percent`、`memory_used`、`memory_free`。
- [ ] Panel 收到 metrics/report 后更新 `system_info` 并广播 `node_update`。
- [ ] Nodes 概况页 CPU/MEM 环图显示真实百分比。
- [ ] Node 详情页 Memory 显示 `used / total` 而非 `total / total`。
- [ ] Node 详情页 Resources 区顶部展示 CPU/MEM/Disk 三个 ResourceRing。
- [ ] 所有相关 Go/TS 测试通过，`bun run typecheck` 无错误，`gofmt` 格式化通过。
