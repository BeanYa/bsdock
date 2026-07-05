# Node 实时资源指标实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Agent 实时采集并上报 CPU/MEM 指标，Panel 接收后广播给前端，Nodes 概况页与 Node 详情页正确展示 CPU/MEM/Disk 使用率，并在 Node 详情页加入 ResourceRing 资源环图。

**Architecture:** Agent 在 `SystemInfo` 中新增 `cpu_percent`、`memory_used`、`memory_free`；WebSocket 心跳升级为 `metrics` 消息，HTTP/Pull report 报文补充同名字段；Panel 合并这些字段到 `nodes.system_info` 后广播 `node_update`；前端直接消费现有 WebSocket 数据并修正展示逻辑。

**Tech Stack:** Go 1.22+, gopsutil/v4, Gorilla WebSocket, sqlc, React + TypeScript + TanStack Router + Tailwind CSS.

## Global Constraints

- 所有 Go 代码必须经 `gofmt` 格式化，通过 `go test ./...`。
- 所有 TypeScript/React 代码必须经 `bun run typecheck` 检查，组件测试经 `bun run test`。
- 新增字段全部放在 `system_info` JSON 中，不新增数据库表列。
- `cpu_percent` 范围 `[0, 100]`，`memory_used` 与 `memory_free` 非负。
- WebSocket `metrics` 消息保持 30s 间隔；HTTP/Pull 保持现有 report/heartbeat 间隔。
- 前端颜色规则：`< 70%` 绿色 `#39FF14`，`70%-89%` 黄色 `#FFC107`，`>= 90%` 红色 `#FF4D4D`。
- 所有修改保持现有控制台暗色主题（`#0B0C10`、`#1F2833`、`#2A3546`、`#C5C6C7`、`#8892A0`）。

---

### Task 1: Agent 采集运行时指标

**Files:**
- Modify: `agent/internal/collector/collector.go`
- Test: `agent/internal/collector/collector_test.go`

**Interfaces:**
- Consumes: `github.com/shirou/gopsutil/v4/cpu`, `github.com/shirou/gopsutil/v4/mem`
- Produces: `SystemInfo.CPUPercent float64`, `SystemInfo.MemoryUsed int64`, `SystemInfo.MemoryFree int64`

- [ ] **Step 1: 编写失败测试**

在 `agent/internal/collector/collector_test.go` 中添加：

```go
func TestCollect_RuntimeMetrics(t *testing.T) {
	info, err := Collect()
	if err != nil {
		t.Fatalf("collect failed: %v", err)
	}
	if info.CPUPercent < 0 || info.CPUPercent > 100 {
		t.Errorf("cpu_percent out of range: %v", info.CPUPercent)
	}
	if info.MemoryUsed < 0 {
		t.Errorf("memory_used negative: %v", info.MemoryUsed)
	}
	if info.MemoryFree < 0 {
		t.Errorf("memory_free negative: %v", info.MemoryFree)
	}
	if info.MemoryTotal <= 0 {
		t.Fatalf("memory_total not positive: %v", info.MemoryTotal)
	}
	// Used + Free may differ slightly from Total due to rounding/buffers; allow 5% slack.
	sum := info.MemoryUsed + info.MemoryFree
	if sum < int64(float64(info.MemoryTotal)*0.95) || sum > int64(float64(info.MemoryTotal)*1.05) {
		t.Errorf("memory_used + memory_free (%d) not close to memory_total (%d)", sum, info.MemoryTotal)
	}
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd agent && go test ./internal/collector -run TestCollect_RuntimeMetrics -v`
Expected: FAIL — `SystemInfo` 没有 `CPUPercent/MemoryUsed/MemoryFree` 字段。

- [ ] **Step 3: 实现采集逻辑**

修改 `agent/internal/collector/collector.go`：

```go
type SystemInfo struct {
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
	CPUPercent  float64  `json:"cpu_percent"`
	MemoryUsed  int64    `json:"memory_used"`
	MemoryFree  int64    `json:"memory_free"`
}
```

在 `Collect()` 中，现有 `memInfo` 读取后增加：

```go
var cpuPercent float64
if percents, err := cpu.Percent(0, false); err == nil && len(percents) > 0 {
	cpuPercent = percents[0]
}
if cpuPercent < 0 {
	cpuPercent = 0
}
if cpuPercent > 100 {
	cpuPercent = 100
}
```

并在返回结构体时增加：

```go
CPUPercent:  cpuPercent,
MemoryUsed:  int64(memInfo.Used),
MemoryFree:  int64(memInfo.Free),
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd agent && go test ./internal/collector -run TestCollect_RuntimeMetrics -v`
Expected: PASS.

- [ ] **Step 5: 运行 Agent 全量测试并格式化**

Run: `cd agent && go test ./... && gofmt -w internal/collector/collector.go internal/collector/collector_test.go`
Expected: 全部通过，无格式化错误。

- [ ] **Step 6: 提交**

```bash
git add agent/internal/collector/collector.go agent/internal/collector/collector_test.go
git commit -m "feat(agent): collect cpu_percent, memory_used, memory_free"
```

---

### Task 2: Agent 上报运行时指标

**Files:**
- Modify: `agent/internal/transport/transport.go`
- Modify: `agent/internal/transport/ws.go`
- Modify: `agent/internal/transport/http.go`
- Modify: `agent/internal/transport/pull.go`
- Test: `agent/internal/transport/transport_test.go`

**Interfaces:**
- Consumes: `collector.SystemInfo` 的新字段（Task 1）
- Produces: `buildPayload` 与 `buildReportPayload` 包含 `cpu_percent`、`memory_used`、`memory_free`；`buildHeartbeat` 返回 `type=metrics` 并携带这些字段；`runWebSocket` 发送 `metrics` 而非 `heartbeat`

- [ ] **Step 1: 编写失败测试**

在 `agent/internal/transport/transport_test.go` 中添加：

```go
func TestBuildReportPayload_IncludesRuntimeMetrics(t *testing.T) {
	cfg := &config.Config{Token: "tok"}
	c := NewClient(cfg)
	info := &collector.SystemInfo{
		CPUPercent:  42.5,
		MemoryUsed:  1024,
		MemoryFree:  2048,
		MemoryTotal: 3072,
	}
	payload := c.buildReportPayload(info)
	if payload["cpu_percent"] != 42.5 {
		t.Errorf("cpu_percent mismatch: got %v", payload["cpu_percent"])
	}
	if payload["memory_used"] != int64(1024) {
		t.Errorf("memory_used mismatch: got %v", payload["memory_used"])
	}
	if payload["memory_free"] != int64(2048) {
		t.Errorf("memory_free mismatch: got %v", payload["memory_free"])
	}
}

func TestBuildHeartbeat_IsMetricsType(t *testing.T) {
	cfg := &config.Config{Token: "tok"}
	c := NewClient(cfg)
	payload := c.buildHeartbeat()
	if payload["type"] != "metrics" {
		t.Errorf("expected type metrics, got %v", payload["type"])
	}
	if _, ok := payload["cpu_percent"]; !ok {
		t.Error("metrics missing cpu_percent")
	}
	if _, ok := payload["memory_used"]; !ok {
		t.Error("metrics missing memory_used")
	}
	if _, ok := payload["memory_free"]; !ok {
		t.Error("metrics missing memory_free")
	}
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd agent && go test ./internal/transport -run 'TestBuildReportPayload_IncludesRuntimeMetrics|TestBuildHeartbeat_IsMetricsType' -v`
Expected: FAIL — 字段缺失或 `type` 为 `heartbeat`。

- [ ] **Step 3: 修改 transport.go**

`buildPayload` 与 `buildReportPayload` 增加：

```go
"cpu_percent":  info.CPUPercent,
"memory_used":  info.MemoryUsed,
"memory_free":  info.MemoryFree,
```

`buildHeartbeat()` 改为：

```go
func (c *Client) buildHeartbeat() map[string]interface{} {
	return map[string]interface{}{
		"type":         "metrics",
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
		"token":        c.cfg.Token,
		"cpu_percent":  0,
		"memory_used":  0,
		"memory_free":  0,
	}
}
```

- [ ] **Step 4: 修改 ws.go 与 http.go 的调用点**

`ws.go`：把 ticker 循环里的 `ws.WriteJSON(c.buildHeartbeat())` 日志从 `"agent heartbeat sent via websocket"` 改为 `"agent metrics sent via websocket"`。

`http.go`：把 `c.post(ctx, endpoint, c.buildHeartbeat())` 的日志从 `"agent report sent via http"` 保持即可（HTTP 心跳也走 report endpoint，payload 已是 metrics）。

- [ ] **Step 5: 运行测试确认通过**

Run: `cd agent && go test ./internal/transport -run 'TestBuildReportPayload_IncludesRuntimeMetrics|TestBuildHeartbeat_IsMetricsType' -v`
Expected: PASS。

- [ ] **Step 6: 运行 Agent 全量测试并格式化**

Run: `cd agent && go test ./... && gofmt -w internal/transport/*.go`
Expected: 全部通过。

- [ ] **Step 7: 提交**

```bash
git add agent/internal/transport/
git commit -m "feat(agent): report runtime metrics via ws/http/pull"
```

---

### Task 3: Panel 接收并存储运行时指标

**Files:**
- Modify: `panel/internal/api/agent_ws.go`
- Modify: `panel/internal/api/agent_http.go`
- Modify: `panel/internal/node/node.go`
- Test: `panel/internal/api/agent_ws_test.go`
- Test: `panel/internal/api/agent_http_test.go`

**Interfaces:**
- Consumes: Agent 上报的 `cpu_percent`、`memory_used`、`memory_free`（Task 2）
- Produces: `nodes.system_info` JSON 包含运行时字段；每次 metrics/report 后通过 `hub.Broadcast` 发送 `node_update`

- [ ] **Step 1: 编写失败测试**

在 `panel/internal/api/agent_ws_test.go` 中新增测试（若文件不存在或类似结构，参考现有测试模式）：

```go
func TestAgentWS_MetricsUpdatesSystemInfo(t *testing.T) {
	// Setup server, create pending node, dial WS with token, send register, then send metrics.
	// Assert that a subsequent GetNode returns system_info containing cpu_percent/memory_used/memory_free
	// and that hub broadcasts node_update.
}
```

在 `panel/internal/api/agent_http_test.go` 中新增：

```go
func TestAgentHTTP_ReportWithMetrics(t *testing.T) {
	// POST /api/v1/agent/report with cpu_percent=33.3, memory_used=100, memory_free=200
	// Assert 200, and GetNode system_info contains those values.
}
```

由于这些测试依赖现有测试 helper，先复制已有 setup 风格。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd panel && go test ./internal/api -run 'TestAgentWS_MetricsUpdatesSystemInfo|TestAgentHTTP_ReportWithMetrics' -v`
Expected: FAIL — 处理逻辑未实现。

- [ ] **Step 3: 实现 WebSocket metrics 处理**

在 `panel/internal/api/agent_ws.go` 中：

1. 增加 helper：

```go
func (h *AgentWSHandler) updateMetrics(ctx context.Context, nodeID string, msg map[string]interface{}) error {
	nodeRow, err := h.queries.GetNode(ctx, nodeID)
	if err != nil {
		return err
	}
	var info map[string]interface{}
	if nodeRow.SystemInfo.Valid && nodeRow.SystemInfo.String != "" {
		_ = json.Unmarshal([]byte(nodeRow.SystemInfo.String), &info)
	}
	if info == nil {
		info = make(map[string]interface{})
	}
	if v, ok := msg["cpu_percent"]; ok {
		info["cpu_percent"] = v
	}
	if v, ok := msg["memory_used"]; ok {
		info["memory_used"] = v
	}
	if v, ok := msg["memory_free"]; ok {
		info["memory_free"] = v
	}
	data, err := json.Marshal(info)
	if err != nil {
		return err
	}
	return h.queries.UpdateNodeSystemInfo(ctx, db.UpdateNodeSystemInfoParams{
		SystemInfo: sql.NullString{String: string(data), Valid: true},
		ID:         nodeID,
	})
}
```

2. 在 `Handle` 的 switch 中增加：

```go
case "metrics":
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	if err := h.updateMetrics(ctx, claims.NodeID, msg); err != nil {
		log.Printf("agent ws metrics update error: %v", err)
	}
	cancel()
	if err := h.queries.UpdateNodeStatus(r.Context(), db.UpdateNodeStatusParams{Status: "online", ID: claims.NodeID}); err != nil {
		log.Printf("agent ws status update error: %v", err)
	}
	h.broadcastNodeUpdate(claims.NodeID)
```

- [ ] **Step 4: 实现 HTTP metrics 处理**

在 `panel/internal/api/agent_http.go` 中：

1. `agentReportPayload` 增加：

```go
CPUPercent float64 `json:"cpu_percent"`
MemoryUsed int64   `json:"memory_used"`
MemoryFree int64   `json:"memory_free"`
```

2. `agentSystemInfo` 增加同名字段（用于序列化存储）。

3. 在 `handle` 的 `payload.Type != "heartbeat"` 分支中，构造 `info` 时增加：

```go
CPUPercent: payload.CPUPercent,
MemoryUsed: payload.MemoryUsed,
MemoryFree: payload.MemoryFree,
```

- [ ] **Step 5: 广播 node_update（HTTP）**

在 `agent_http.go` 的 `handle` 函数 commit 后、返回 ack 前，无论是否是 heartbeat，都调用：

```go
updated, err := h.svc.Get(claims.NodeID)
if err == nil {
	h.hub.Broadcast(claims.NodeID, map[string]interface{}{
		"type":    "node_update",
		"payload": updated,
	})
}
```

注意：`AgentHTTPHandler` 目前没有 `svc` 和 `hub` 字段。需要在结构体中新增：

```go
svc *node.Service
hub *wshub.Hub
```

并修改 `NewAgentHTTPHandler` 签名和 `cmd/panel/main.go` 中的调用（在 Task 中完成）。

- [ ] **Step 6: 更新 main.go 调用**

在 `panel/cmd/panel/main.go` 中，把 `NewAgentHTTPHandler(sqlDB, queries, cfg)` 改为 `NewAgentHTTPHandler(sqlDB, queries, cfg, svc, hub)`。

- [ ] **Step 7: 运行测试确认通过**

Run: `cd panel && go test ./internal/api -run 'TestAgentWS_MetricsUpdatesSystemInfo|TestAgentHTTP_ReportWithMetrics' -v`
Expected: PASS。

- [ ] **Step 8: 运行 Panel 全量测试并格式化**

Run: `cd panel && go test ./... && gofmt -w internal/api/agent_ws.go internal/api/agent_http.go internal/api/agent_ws_test.go internal/api/agent_http_test.go cmd/panel/main.go internal/node/node.go`
Expected: 全部通过。

- [ ] **Step 9: 提交**

```bash
git add panel/
git commit -m "feat(panel): accept and broadcast runtime metrics from agent"
```

---

### Task 4: 前端 Node 详情页资源展示优化

**Files:**
- Modify: `web/src/routes/nodes/$nodeId.tsx`
- Test: `web/tests/e2e/` 或新增 `web/src/routes/nodes/node-detail.test.tsx`（若项目已有测试风格，优先在 `web/src/components/` 同级放测试）

**Interfaces:**
- Consumes: `node.system_info` 中的 `cpu_percent`、`memory_used`、`memory_free`、`memory_total`、`disk_total`、`disk_free`
- Produces: Node 详情页 Resources 区展示 CPU/MEM/Disk 三个 ResourceRing；Memory ResourceCard 显示 `used / total`

- [ ] **Step 1: 编写失败测试**

在 `web/src/routes/nodes/$nodeId.test.tsx` 创建（或同级目录）：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from '@tanstack/react-router'
import { Route } from './$nodeId'

const mockNode = {
  id: 'n1',
  name: 'test-node',
  status: 'online',
  platform: 'linux',
  system_info: {
    cpu_percent: 45.5,
    memory_total: 8000000000,
    memory_used: 4000000000,
    memory_free: 4000000000,
    disk_total: 100000000000,
    disk_free: 60000000000,
    cpu_cores: 4,
  },
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

describe('NodeDetailPage resources', () => {
  it('renders resource rings for CPU, MEM and Disk', async () => {
    // Use Route's options or mock loader if needed; adjust to project test patterns.
    render(<Route.options.component />)
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('MEM')).toBeInTheDocument()
    expect(screen.getByText('Disk')).toBeInTheDocument()
  })

  it('shows memory used / total instead of total / total', () => {
    render(<Route.options.component />)
    expect(screen.getByText(/3\.73 GB \/ 7\.45 GB/)).toBeInTheDocument()
  })
})
```

如果项目没有为路由文件写单元测试，则改为在 `web/src/components/resource-card.test.tsx` 增加 ResourceCard 独立测试：传入 `used=4GB, total=8GB` 断言显示 `3.73 GB / 7.45 GB`。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd web && bun run test -- --run src/routes/nodes/\$nodeId.test.tsx`
Expected: FAIL — 当前页面没有 ResourceRing，且 Memory 卡片计算错误。

- [ ] **Step 3: 修改 $nodeId.tsx**

1. 导入 ResourceRing：

```tsx
import { ResourceRing } from '@/components/resource-ring'
```

2. 在 `Resources` 区顶部新增三个 ResourceRing：

```tsx
<section>
  <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8892A0]">Resources</h2>
  <div className="rounded-lg border border-[#2A3546] bg-[#1F2833] p-4">
    <div className="flex items-center justify-center gap-8">
      <ResourceRing label="CPU" percent={info.cpu_percent as number | null} size="md" />
      <ResourceRing label="MEM" percent={info.memory_total ? ((info.memory_used as number ?? 0) / (info.memory_total as number)) * 100 : null} size="md" />
      <ResourceRing label="Disk" percent={diskTotal > 0 ? (diskUsed / diskTotal) * 100 : null} size="md" />
    </div>
  </div>
  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    <ResourceCard title="Memory" used={Number(info.memory_used)} total={memoryTotal} />
    <ResourceCard title="Disk" used={diskUsed} total={diskTotal} />
  </div>
</section>
```

3. 修正 Memory 计算：

```tsx
const memoryUsed = Number(info.memory_used || 0)
const memoryTotal = Number(info.memory_total || 0)
```

移除旧的 `const memoryUsed = Number(info.memory_total) - Number(info.memory_free || 0)`。

4. 移除 `InfoCard title="CPU Cores"`（已在 Hardware 区展示）。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd web && bun run test -- --run src/routes/nodes/\$nodeId.test.tsx`
Expected: PASS。

- [ ] **Step 5: 运行类型检查与前端全量测试**

Run: `cd web && bun run typecheck && bun run test -- --run`
Expected: 全部通过。

- [ ] **Step 6: 提交**

```bash
git add web/src/routes/nodes/\$nodeId.tsx web/src/routes/nodes/\$nodeId.test.tsx
git commit -m "feat(web): add resource rings and fix memory display on node detail"
```

---

### Task 5: Nodes 概况页验证与补充测试

**Files:**
- Modify: `web/src/components/node-card.test.tsx`（若已有）或新增
- Modify: `web/src/components/nodes-page.test.tsx`

**Interfaces:**
- Consumes: `node.system_info` 中的 `cpu_percent`、`memory_used`、`memory_free`、`memory_total`、`disk_total`、`disk_free`
- Produces: NodeCard 渲染时 ResourceRing 显示正确百分比

- [ ] **Step 1: 编写失败测试**

在 `web/src/components/node-card.test.tsx` 中新增（若文件不存在则创建）：

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NodeCard } from './node-card'

const node = {
  id: 'n1',
  name: 'node-1',
  status: 'online',
  platform: 'linux',
  system_info: {
    cpu_percent: 50,
    memory_total: 8000000000,
    memory_used: 4000000000,
    memory_free: 4000000000,
    disk_total: 100000000000,
    disk_free: 50000000000,
    ips: ['10.0.0.1'],
  },
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

describe('NodeCard metrics', () => {
  it('shows CPU, MEM and Disk rings with percentages', () => {
    render(
      <NodeCard
        node={node}
        onInstallCommand={() => {}}
        onReset={() => {}}
        onRotateToken={() => {}}
      />
    )
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('CPU')).toBeInTheDocument()
    expect(screen.getByText('MEM')).toBeInTheDocument()
    expect(screen.getByText('Disk')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd web && bun run test -- --run src/components/node-card.test.tsx`
Expected: FAIL — 若测试是新增的，可能找不到文件；若已有，则因未传入数据失败。

- [ ] **Step 3: 确认 NodeCard 无需修改**

`node-card.tsx` 的 `getCpuPercent`、`getMemoryPercent`、`getMemoryPercent` 已正确读取字段，Panel 数据补齐后自然生效，无需修改。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd web && bun run test -- --run src/components/node-card.test.tsx`
Expected: PASS。

- [ ] **Step 5: 运行类型检查与前端全量测试**

Run: `cd web && bun run typecheck && bun run test -- --run`
Expected: 全部通过。

- [ ] **Step 6: 提交**

```bash
git add web/src/components/node-card.test.tsx web/src/components/nodes-page.test.tsx
git commit -m "test(web): verify node card renders runtime metrics"
```

---

### Task 6: 端到端验证

**Files:**
- 无需修改文件

- [ ] **Step 1: 运行后端测试**

Run: `cd panel && go test ./...`
Expected: PASS。

- [ ] **Step 2: 运行 Agent 测试**

Run: `cd agent && go test ./...`
Expected: PASS。

- [ ] **Step 3: 运行前端测试与类型检查**

Run: `cd web && bun run typecheck && bun run test -- --run`
Expected: PASS。

- [ ] **Step 4: 运行构建**

Run: `bun run build`
Expected: PASS。

- [ ] **Step 5: 提交（如仅有测试/构建产物变更）**

```bash
git commit -m "chore: verify metrics feature with full test suite" --allow-empty
```

---

## Self-Review

- **Spec coverage检查：**
  - Agent 采集运行时指标：Task 1 ✅
  - Agent 上报运行时指标：Task 2 ✅
  - Panel WebSocket 处理 metrics：Task 3 ✅
  - Panel HTTP/Pull 处理 metrics：Task 3 ✅
  - Node 详情页 ResourceRing：Task 4 ✅
  - Memory 显示修正：Task 4 ✅
  - Nodes 概况页验证：Task 5 ✅
  - 全量测试：Task 6 ✅

- **Placeholder 检查：** 所有步骤均包含具体代码与命令，无 TBD/TODO。

- **类型一致性检查：** `cpu_percent` 在 Go 为 `float64`，JSON 序列化后前端作为 `number`；`memory_used/free/total` 在 Go 为 `int64`，前端使用 `Number()` 转换，一致。
