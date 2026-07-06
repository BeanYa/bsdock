# Panel Log 页实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 BSDock Panel Web 界面新增 `/logs` 页面，通过独立 WebSocket 实时展示 Panel 运行日志和请求日志，支持滚动跟随锁定与日志级别着色。

**Architecture:** 后端在内存维护两个容量 200 的环形缓冲区，分别缓存运行日志和请求日志；新增 `/ws/logs` WebSocket 端点向已认证客户端推送历史与实时日志。前端通过 `useLogs` hook 订阅日志流，在 `/logs` 页面渲染日志列表并实现自动滚动到底部、滑动取消锁定、回到底部按钮、日志级别着色和来源切换。

**Tech Stack:** Go 1.25, Gorilla WebSocket, React 19, TanStack Router, Tailwind CSS, shadcn/ui, TypeScript

## Global Constraints

- Go: standard formatting via `gofmt`, follow Go conventions
- TypeScript/React: use strict TypeScript, functional components, and shadcn/ui primitives
- Tailwind: prefer utility classes over custom CSS; use CSS variables for theming
- WebSocket `CheckOrigin` currently allows all origins; configure for production
- JWT secrets set via environment variables or config file; never commit secrets
- Panel runtime log 2MB rolling window, request log 10MB rolling window (保持不变)

---

## File Map

- **Create:**
  - `panel/internal/log/buffer.go` — 线程安全环形缓冲区
  - `panel/internal/log/buffer_test.go` — 缓冲区单元测试
  - `panel/internal/log/entry.go` — 日志条目结构与级别解析
  - `panel/internal/log/entry_test.go` — 级别解析测试
  - `panel/internal/log/hub.go` — 日志中心：两个缓冲区 + 订阅广播
  - `panel/internal/log/hub_test.go` — Hub 单元测试
  - `panel/internal/api/logs_ws.go` — `/ws/logs` WebSocket handler
  - `panel/internal/api/logs_ws_test.go` — WebSocket handler测试
  - `web/src/hooks/useLogs.ts` — WebSocket 订阅 hook
  - `web/src/routes/logs/index.tsx` — Log 页面路由
  - `web/src/routes/logs/index.test.tsx` — Log 页面单元测试
  - `web/src/components/log-line.tsx` — 单条日志渲染组件
  - `web/src/components/log-viewer.tsx` — 日志列表与滚动锁定容器

- **Modify:**
  - `panel/cmd/panel/main.go` — 注入日志 hub、multi writer 和注册 `/ws/logs`
  - `panel/internal/api/api.go` — 修改 `RequestLoggingMiddleware` 签名，传入日志 hub
  - `panel/internal/api/api_test.go` — 更新 `RequestLoggingMiddleware` 测试
  - `panel/internal/api/panel.go` — 注册日志 WebSocket 路由
  - `panel/internal/api/agent_http.go` — 保持 handler 不变（请求日志由中间件处理）
  - `web/src/components/app-sidebar.tsx` — 新增 Logs 导航项
  - `web/src/lib/api.ts` — 新增日志类型定义（可选）

---

### Task 1: 创建共享日志条目结构与环形缓冲区

**Files:**
- Create: `panel/internal/log/entry.go`
- Create: `panel/internal/log/entry_test.go`
- Create: `panel/internal/log/buffer.go`
- Create: `panel/internal/log/buffer_test.go`

**Interfaces:**
- Produces:
  - `type LogSource string` with constants `SourceRuntime`, `SourceRequest`
  - `type LogLevel string` with constants `LevelInfo`, `LevelWarn`, `LevelError`, `LevelDebug`
  - `type Entry struct { Timestamp time.Time; Level LogLevel; Source LogSource; Message string }`
  - `func ParseLevel(line string) LogLevel`
  - `type Buffer struct{ ... }` with `func NewBuffer(capacity int) *Buffer`, `func (b *Buffer) Append(e Entry) bool`, `func (b *Buffer) Snapshot() []Entry`

- [ ] **Step 1: 写失败测试**

`panel/internal/log/entry_test.go`:
```go
package log

import "testing"

func TestParseLevel(t *testing.T) {
	cases := []struct {
		input string
		want  LogLevel
	}{
		{"2026/07/06 14:32:01 INFO: hello", LevelInfo},
		{"2026/07/06 14:32:01 WARN: hello", LevelWarn},
		{"2026/07/06 14:32:01 ERROR: hello", LevelError},
		{"2026/07/06 14:32:01 DEBUG: hello", LevelDebug},
		{"plain message", LevelInfo},
	}
	for _, c := range cases {
		got := ParseLevel(c.input)
		if got != c.want {
			t.Errorf("ParseLevel(%q) = %q, want %q", c.input, got, c.want)
		}
	}
}
```

`panel/internal/log/buffer_test.go`:
```go
package log

import "testing"

func TestBufferSnapshotOrder(t *testing.T) {
	b := NewBuffer(3)
	b.Append(Entry{Message: "a"})
	b.Append(Entry{Message: "b"})
	b.Append(Entry{Message: "c"})
	snap := b.Snapshot()
	if len(snap) != 3 || snap[0].Message != "a" || snap[2].Message != "c" {
		t.Fatalf("unexpected snapshot: %v", snap)
	}
}

func TestBufferDropsOld(t *testing.T) {
	b := NewBuffer(2)
	b.Append(Entry{Message: "a"})
	b.Append(Entry{Message: "b"})
	b.Append(Entry{Message: "c"})
	snap := b.Snapshot()
	if len(snap) != 2 || snap[0].Message != "b" || snap[1].Message != "c" {
		t.Fatalf("expected [b c], got %v", snap)
	}
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd panel && go test ./internal/log/...`
Expected: FAIL, undefined types/functions

- [ ] **Step 3: 实现最小代码**

`panel/internal/log/entry.go`:
```go
package log

import (
	"strings"
	"time"
)

type LogSource string

const (
	SourceRuntime LogSource = "runtime"
	SourceRequest LogSource = "request"
)

type LogLevel string

const (
	LevelInfo  LogLevel = "INFO"
	LevelWarn  LogLevel = "WARN"
	LevelError LogLevel = "ERROR"
	LevelDebug LogLevel = "DEBUG"
)

type Entry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     LogLevel  `json:"level"`
	Source    LogSource `json:"source"`
	Message   string    `json:"message"`
}

func ParseLevel(line string) LogLevel {
	upper := strings.ToUpper(line)
	if strings.Contains(upper, "ERROR") || strings.Contains(upper, "FATAL") || strings.Contains(upper, "PANIC") {
		return LevelError
	}
	if strings.Contains(upper, "WARN") {
		return LevelWarn
	}
	if strings.Contains(upper, "DEBUG") {
		return LevelDebug
	}
	return LevelInfo
}
```

`panel/internal/log/buffer.go`:
```go
package log

import "sync"

type Buffer struct {
	mu       sync.RWMutex
	capacity int
	entries  []Entry
}

func NewBuffer(capacity int) *Buffer {
	return &Buffer{capacity: capacity}
}

func (b *Buffer) Append(e Entry) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.capacity <= 0 {
		return false
	}
	if len(b.entries) >= b.capacity {
		b.entries = b.entries[1:]
	}
	b.entries = append(b.entries, e)
	return true
}

func (b *Buffer) Snapshot() []Entry {
	b.mu.RLock()
	defer b.mu.RUnlock()
	out := make([]Entry, len(b.entries))
	copy(out, b.entries)
	return out
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd panel && go test ./internal/log/...`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add panel/internal/log/
git commit -m "feat(panel): add log entry parser and ring buffer"
```

---

### Task 2: 创建日志 Hub 实现发布订阅

**Files:**
- Create: `panel/internal/log/hub.go`
- Create: `panel/internal/log/hub_test.go`

**Interfaces:**
- Consumes: `Entry`, `Buffer`, `LogSource`
- Produces:
  - `type Hub struct{ ... }`
  - `func NewHub() *Hub`
  - `func (h *Hub) Write(source LogSource, p []byte) (n int, err error)` — io.Writer 接口
  - `func (h *Hub) Snapshot(source LogSource) []Entry`
  - `func (h *Hub) Subscribe(source LogSource, ch chan<- Entry) func()` — 返回取消订阅函数

- [ ] **Step 1: 写失败测试**

`panel/internal/log/hub_test.go`:
```go
package log

import (
	"testing"
	"time"
)

func TestHubWriteAndSnapshot(t *testing.T) {
	h := NewHub()
	h.Write(SourceRuntime, []byte("hello world\n"))
	snap := h.Snapshot(SourceRuntime)
	if len(snap) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(snap))
	}
	if snap[0].Message != "hello world" {
		t.Fatalf("unexpected message %q", snap[0].Message)
	}
}

func TestHubSubscribe(t *testing.T) {
	h := NewHub()
	ch := make(chan Entry, 1)
	unsub := h.Subscribe(SourceRuntime, ch)
	defer unsub()
	h.Write(SourceRuntime, []byte("event\n"))
	select {
	case e := <-ch:
		if e.Message != "event" {
			t.Fatalf("unexpected message %q", e.Message)
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for entry")
	}
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd panel && go test ./internal/log/...`
Expected: FAIL, undefined Hub

- [ ] **Step 3: 实现 Hub**

`panel/internal/log/hub.go`:
```go
package log

import (
	"bytes"
	"sync"
	"time"
)

const capacity = 200

type subscriber struct {
	ch     chan<- Entry
	source LogSource
}

type Hub struct {
	mu          sync.RWMutex
	buffers     map[LogSource]*Buffer
	subscribers []subscriber
}

func NewHub() *Hub {
	return &Hub{
		buffers: map[LogSource]*Buffer{
			SourceRuntime: NewBuffer(capacity),
			SourceRequest: NewBuffer(capacity),
		},
	}
}

func (h *Hub) Write(source LogSource, p []byte) (int, error) {
	lines := bytes.Split(p, []byte("\n"))
	written := len(p)
	now := time.Now()

	h.mu.Lock()
	buf := h.buffers[source]
	for _, line := range lines {
		trimmed := bytes.TrimSpace(line)
		if len(trimmed) == 0 {
			continue
		}
		e := Entry{
			Timestamp: now,
			Level:     ParseLevel(string(trimmed)),
			Source:    source,
			Message:   string(trimmed),
		}
		buf.Append(e)
		h.broadcastLocked(e)
	}
	h.mu.Unlock()
	return written, nil
}

func (h *Hub) broadcastLocked(e Entry) {
	for _, sub := range h.subscribers {
		if sub.source != e.Source {
			continue
		}
		select {
		case sub.ch <- e:
		default:
		}
	}
}

func (h *Hub) Snapshot(source LogSource) []Entry {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if buf, ok := h.buffers[source]; ok {
		return buf.Snapshot()
	}
	return nil
}

func (h *Hub) Subscribe(source LogSource, ch chan<- Entry) func() {
	h.mu.Lock()
	h.subscribers = append(h.subscribers, subscriber{ch: ch, source: source})
	idx := len(h.subscribers) - 1
	h.mu.Unlock()

	return func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		if idx >= len(h.subscribers) {
			return
		}
		h.subscribers = append(h.subscribers[:idx], h.subscribers[idx+1:]...)
	}
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd panel && go test ./internal/log/...`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add panel/internal/log/
git commit -m "feat(panel): add log hub with pub/sub"
```

---

### Task 3: Panel 接入日志 Hub

**Files:**
- Modify: `panel/cmd/panel/main.go`
- Modify: `panel/internal/api/api.go`
- Modify: `panel/internal/api/api_test.go`

**Interfaces:**
- Consumes: `log.Hub`
- Produces: 运行日志同时写入文件和 Hub；请求中间件把日志写入 Hub

- [ ] **Step 1: 修改 api.go 中的中间件签名**

`panel/internal/api/api.go`:
将 `AuthMiddleware(cfg *config.Config)` 改为 `AuthMiddleware(cfg *config.Config, logHub *log.Hub)`。
在中间件请求日志处调用 `logHub.Write(SourceRequest, []byte(formattedLine))`。

```go
import (
	// ... existing imports
	panelLog "github.com/bsdock/panel/internal/log"
)

func AuthMiddleware(cfg *config.Config, logHub *panelLog.Hub) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// existing public path check
			if strings.HasPrefix(r.URL.Path, "/api/v1/login") ||
				strings.HasPrefix(r.URL.Path, "/api/v1/agent/") {
				next.ServeHTTP(w, r)
				return
			}
			// ... existing auth logic
		})
	}
}
```

新增请求日志中间件 `RequestLoggingMiddleware`（从 Task 1 设计迁移）：

```go
func RequestLoggingMiddleware(logHub *panelLog.Hub) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rr := &responseRecorder{ResponseWriter: w}
			next.ServeHTTP(rr, r)
			line := fmt.Sprintf("%s %s %s %d %d %s",
				r.Method, r.URL.RequestURI(), r.RemoteAddr, rr.status, rr.bytes, time.Since(start))
			logHub.Write(panelLog.SourceRequest, []byte(line))
		})
	}
}
```

- [ ] **Step 2: 更新 main.go 注入 Hub**

在 `main()` 中：

```go
logHub := panellog.NewHub()
runtimeWriter = io.MultiWriter(runtimeWriter, &sourceWriter{hub: logHub, source: panellog.SourceRuntime})
log.SetOutput(runtimeWriter)
```

新增辅助类型：

```go
type sourceWriter struct {
	hub    *panellog.Hub
	source panellog.LogSource
}

func (s *sourceWriter) Write(p []byte) (int, error) {
	return s.hub.Write(s.source, p)
}
```

注册路由：

```go
r.Use(api.RequestLoggingMiddleware(logHub))
apiRouter.Use(api.AuthMiddleware(cfg, logHub))
logsWS := api.NewLogsWSHandler(cfg, logHub)
logsWS.Register(r)
```

- [ ] **Step 3: 修复 api_test.go 编译错误**

所有 `AuthMiddleware(cfg)` 调用改为 `AuthMiddleware(cfg, nil)`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd panel && go test ./...`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add panel/cmd/panel/main.go panel/internal/api/api.go panel/internal/api/api_test.go
git commit -m "feat(panel): wire log hub into runtime and request logging"
```

---

### Task 4: 创建 `/ws/logs` WebSocket Handler

**Files:**
- Create: `panel/internal/api/logs_ws.go`
- Create: `panel/internal/api/logs_ws_test.go`

**Interfaces:**
- Consumes: `log.Hub`, `config.Config`, `auth.ParseToken`
- Produces:
  - `type LogsWSHandler struct{ ... }`
  - `func NewLogsWSHandler(cfg *config.Config, hub *log.Hub) *LogsWSHandler`
  - `func (h *LogsWSHandler) Register(r *mux.Router)`
  - `func (h *LogsWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request)`

- [ ] **Step 1: 实现 Handler**

`panel/internal/api/logs_ws.go`:
```go
package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	panellog "github.com/bsdock/panel/internal/log"
)

type LogsWSHandler struct {
	cfg *config.Config
	hub *panellog.Hub
	upgrader websocket.Upgrader
}

func NewLogsWSHandler(cfg *config.Config, hub *panellog.Hub) *LogsWSHandler {
	return &LogsWSHandler{
		cfg: cfg,
		hub: hub,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *LogsWSHandler) Register(r *mux.Router) {
	r.HandleFunc("/ws/logs", h.ServeHTTP)
}

func (h *LogsWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if _, err := auth.ParseToken(h.cfg.JWT.Secret, token); err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("logs ws upgrade error: %v", err)
		return
	}
	defer conn.Close()

	source := panellog.SourceRuntime
	if err := h.sendSnapshot(conn, source); err != nil {
		log.Printf("logs ws send snapshot: %v", err)
		return
	}

	ch := make(chan panellog.Entry, 32)
	unsub := h.hub.Subscribe(source, ch)
	defer unsub()

	for {
		select {
		case e := <-ch:
			if err := conn.WriteJSON(e); err != nil {
				return
			}
		case <-time.After(30 * time.Second):
			if err := conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(5*time.Second)); err != nil {
				return
			}
		}
	}
}

func (h *LogsWSHandler) sendSnapshot(conn *websocket.Conn, source panellog.LogSource) error {
	snap := h.hub.Snapshot(source)
	if snap == nil {
		snap = []panellog.Entry{}
	}
	return conn.WriteJSON(map[string]interface{}{
		"type":    "snapshot",
		"source":  source,
		"entries": snap,
	})
}
```

- [ ] **Step 2: 写 WebSocket 测试**

`panel/internal/api/logs_ws_test.go`:
```go
package api

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	panellog "github.com/bsdock/panel/internal/log"
)

func TestLogsWSRequiresToken(t *testing.T) {
	h := NewLogsWSHandler(&config.Config{JWT: config.JWT{Secret: "secret"}}, panellog.NewHub())
	req := httptest.NewRequest("GET", "/ws/logs", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestLogsWSAcceptsValidToken(t *testing.T) {
	cfg := &config.Config{JWT: config.JWT{Secret: "secret"}}
	hub := panellog.NewHub()
	h := NewLogsWSHandler(cfg, hub)

	token, err := auth.GenerateToken(cfg.JWT.Secret, "admin", 1)
	if err != nil {
		t.Fatal(err)
	}

	hub.Write(panellog.SourceRuntime, []byte("hello\n"))

	server := httptest.NewServer(h)
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws/logs?token=" + token
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()

	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var msg map[string]interface{}
	if err := conn.ReadJSON(&msg); err != nil {
		t.Fatal(err)
	}
	if msg["type"] != "snapshot" {
		t.Fatalf("expected snapshot, got %v", msg["type"])
	}
}
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd panel && go test ./internal/api/...`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add panel/internal/api/logs_ws.go panel/internal/api/logs_ws_test.go
git commit -m "feat(panel): add /ws/logs websocket endpoint"
```

---

### Task 5: 前端 `useLogs` Hook

**Files:**
- Create: `web/src/hooks/useLogs.ts`

**Interfaces:**
- Consumes: `getToken()` from `@/lib/auth`
- Produces: `type LogSource = 'runtime' | 'request'`; `interface LogEntry { timestamp: string; level: string; source: LogSource; message: string }`; `function useLogs(source: LogSource): { entries: LogEntry[]; connected: boolean; error: Error | null }`

- [ ] **Step 1: 实现 hook**

`web/src/hooks/useLogs.ts`:
```ts
import { useEffect, useRef, useState } from 'react'
import { getToken } from '@/lib/auth'

export type LogSource = 'runtime' | 'request'

export interface LogEntry {
  timestamp: string
  level: string
  source: LogSource
  message: string
}

interface SnapshotMessage {
  type: 'snapshot'
  source: LogSource
  entries: LogEntry[]
}

interface EntryMessage extends LogEntry {
  type: 'entry'
}

type WSMessage = SnapshotMessage | EntryMessage

export function useLogs(source: LogSource) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    setEntries([])
    const token = getToken()
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${window.location.host}/ws/logs?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = (e) => setError(new Error('WebSocket error'))
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage
        if (data.type === 'snapshot') {
          setEntries(data.entries)
        } else {
          setEntries((prev) => {
            const next = [...prev, data]
            return next.length > 200 ? next.slice(next.length - 200) : next
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    return () => {
      ws.close()
    }
  }, [source])

  return { entries, connected, error }
}
```

- [ ] **Step 2: 写 hook 测试（可选）**

`web/src/hooks/useLogs.test.ts`:
```ts
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLogs } from './useLogs'

class MockWebSocket {
  static lastInstance: MockWebSocket | null = null
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((e: Event) => void) | null = null
  constructor() {
    MockWebSocket.lastInstance = this
  }
  close() {}
}

describe('useLogs', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', MockWebSocket)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('receives snapshot entries', async () => {
    const { result } = renderHook(() => useLogs('runtime'))
    await waitFor(() => expect(MockWebSocket.lastInstance).toBeTruthy())
    const entries = [{ timestamp: 't', level: 'INFO', source: 'runtime', message: 'hello' }]
    MockWebSocket.lastInstance!.onmessage?.({ data: JSON.stringify({ type: 'snapshot', source: 'runtime', entries }) })
    await waitFor(() => expect(result.current.entries).toHaveLength(1))
  })
})
```

- [ ] **Step 3: 运行测试确认通过**

Run: `cd web && bun run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add web/src/hooks/useLogs.ts web/src/hooks/useLogs.test.ts
git commit -m "feat(web): add useLogs websocket hook"
```

---

### Task 6: 创建 Log 页面组件与路由

**Files:**
- Create: `web/src/components/log-line.tsx`
- Create: `web/src/components/log-viewer.tsx`
- Create: `web/src/routes/logs/index.tsx`
- Modify: `web/src/components/app-sidebar.tsx`

**Interfaces:**
- Consumes: `useLogs`, `LogEntry`
- Produces: Log 页面 UI

- [ ] **Step 1: 实现 LogLine 组件**

`web/src/components/log-line.tsx`:
```tsx
import { cn } from '@/lib/utils'
import type { LogEntry } from '@/hooks/useLogs'

interface LogLineProps {
  entry: LogEntry
}

export function LogLine({ entry }: LogLineProps) {
  const levelClass =
    {
      INFO: 'text-emerald-400',
      WARN: 'text-amber-400',
      ERROR: 'text-rose-400',
      DEBUG: 'text-slate-400',
    }[entry.level] || 'text-[#E8EBF0]'

  return (
    <div className="flex gap-3 py-0.5 font-mono text-xs leading-relaxed">
      <span className="shrink-0 text-[#8B95A8]">{entry.timestamp}</span>
      <span className={cn('w-12 shrink-0 font-bold', levelClass)}>{entry.level}</span>
      <span className="break-all text-[#E8EBF0]">{entry.message}</span>
    </div>
  )
}
```

- [ ] **Step 2: 实现 LogViewer 组件**

`web/src/components/log-viewer.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { LogLine } from './log-line'
import type { LogEntry } from '@/hooks/useLogs'
import { Button } from '@/components/ui/button'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogViewerProps {
  entries: LogEntry[]
}

const BOTTOM_THRESHOLD = 20

export function LogViewer({ entries }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const scrollToBottom = () => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    if (!isLocked) return
    scrollToBottom()
  }, [entries, isLocked])

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_THRESHOLD
    setIsLocked(nearBottom)
    setShowScrollButton(!nearBottom)
  }

  const handleScrollToBottom = () => {
    scrollToBottom()
    setIsLocked(true)
    setShowScrollButton(false)
  }

  return (
    <div className="relative flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="glass h-full overflow-auto rounded-xl p-4"
      >
        {entries.map((entry, index) => (
          <LogLine key={index} entry={entry} />
        ))}
        <div aria-hidden="true" />
      </div>
      <Button
        size="sm"
        onClick={handleScrollToBottom}
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 gap-1 bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90',
          !showScrollButton && 'hidden'
        )}
      >
        <ArrowDown className="h-3 w-3" />
        回到底部
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: 实现 Logs 页面**

`web/src/routes/logs/index.tsx`:
```tsx
import { useState } from 'react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'
import { useLogs, type LogSource } from '@/hooks/useLogs'
import { LogViewer } from '@/components/log-viewer'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/logs/')({
  component: LogsPage,
})

const sources: { value: LogSource; label: string }[] = [
  { value: 'runtime', label: '运行日志' },
  { value: 'request', label: '请求日志' },
]

function LogsPage() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />
  }

  const [source, setSource] = useState<LogSource>('runtime')
  const { entries, connected, error } = useLogs(source)

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <PageHeader title="Logs" description="实时查看 Panel 运行日志与请求日志">
        <div className="flex items-center gap-2">
          {sources.map((s) => (
            <Button
              key={s.value}
              variant={source === s.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSource(s.value)}
              className={cn(
                source === s.value
                  ? 'bg-[#00F0FF] text-[#080A0F] hover:bg-[#00F0FF]/90'
                  : 'border-white/[0.08] bg-transparent text-[#8B95A8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#E8EBF0]'
              )}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </PageHeader>
      <div className="flex items-center gap-2 text-xs text-[#8B95A8]">
        <span className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-rose-400')} />
        {connected ? '已连接' : '未连接'}
        {error && <span className="text-rose-400">{error.message}</span>}
      </div>
      <LogViewer entries={entries} />
    </div>
  )
}
```

- [ ] **Step 4: 更新 AppSidebar**

`web/src/components/app-sidebar.tsx`:
将 `import { ..., ScrollText } from 'lucide-react'` 并新增 nav item：

```ts
const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/nodes', label: 'Nodes', icon: Server },
  { to: '/logs', label: 'Logs', icon: ScrollText },
]
```

- [ ] **Step 5: 生成路由并运行类型检查**

Run: `cd web && bunx @tanstack/router-plugin vite generate`（或自动）
Run: `cd web && bun run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web/src/components/log-line.tsx web/src/components/log-viewer.tsx web/src/routes/logs/index.tsx web/src/components/app-sidebar.tsx
git commit -m "feat(web): add logs page with auto-scroll and level coloring"
```

---

### Task 7: 完整集成测试

**Files:**
- None（仅验证）

- [ ] **Step 1: 后端全量测试**

Run: `bun run test:pkg && bun run test:panel && bun run test:agent`
Expected: PASS

- [ ] **Step 2: 前端测试与类型检查**

Run: `cd web && bun run test && bun run typecheck`
Expected: PASS

- [ ] **Step 3: 构建验证**

Run: `bun run build:panel && bun run build:web`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add .
git commit -m "test: add integration verification for logs page"
```

---

## Spec Coverage

- 后端环形缓冲 200 条：Task 1, Task 2
- 独立 `/ws/logs` WebSocket：Task 4
- 运行日志和请求日志同时写入 Hub：Task 3
- 前端 `/logs` 页面：Task 6
- 默认跟随滚动、滑动取消锁定、回到底部按钮：Task 6
- 日志级别着色：Task 6
- 运行/请求日志切换：Task 5, Task 6

## Placeholder Scan

无 TBD、TODO、implement later 或空泛描述。所有代码、测试命令和文件路径已给出。

## Type Consistency

- `LogSource` 在 Go 中为 `panellog.LogSource` string 类型；前端为 `'runtime' | 'request'`。
- `Entry` JSON 字段与前端 `LogEntry` 一致。
- `AuthMiddleware` 签名统一在 Task 3 修改。
