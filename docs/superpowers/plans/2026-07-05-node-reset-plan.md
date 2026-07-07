# Node Reset 功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `online` 状态的节点添加 Reset 功能：后端新增 `POST /api/v1/nodes/{id}/reset` 接口，生成新 Token 并将节点状态重置为 `pending`；前端对 `online` 节点隐藏 Install Command 并显示 Reset 菜单项。

**Architecture:** 后端沿用现有 Token 轮换逻辑：生成新安装 Token → 计算 SHA256 Hash → 更新 `token_hash`、`token_used = FALSE`、`status = 'pending'`；前端复用安装命令展示弹窗，按节点状态渲染不同操作菜单。

**Tech Stack:** Go + SQLite + sqlc + gorilla/mux；Vite + React + TypeScript + shadcn/ui + TanStack Router + Playwright

## Global Constraints

- 仅对 `online` 节点显示 Reset 操作；`pending` / `offline` 节点保持 Install Command 入口。
- Reset 保留 `system_info` 和 `last_seen_at` 不变。
- 原 Token 失效通过更新 `token_hash` 实现（Agent 认证时校验 Hash 匹配）。
- 后端所有变更需通过 `go test ./...` 验证。
- 前端所有变更需通过 `bun run test` 和 `bunx playwright test tests/e2e/layout.spec.ts --project=chromium` 验证。
- 每次任务完成后提交，提交信息遵循 conventional commits。

---

## File Structure

### 后端修改文件

- `panel/internal/db/queries.sql` — 新增 `ResetNode` SQL 查询。
- `panel/internal/db/sqlc.yaml` — 重新创建 sqlc 配置文件（仓库历史中存在，后续被误删）。
- `panel/internal/db/queries.sql.go` — 由 `sqlc generate` 重新生成，新增 `ResetNode` 方法。
- `panel/internal/node/node.go` — 新增 `Reset` Service 方法。
- `panel/internal/api/nodes.go` — 新增 `Reset` HTTP handler 和路由注册。
- `panel/internal/node/node_test.go` — 新增 `Reset` 单元测试。
- `panel/internal/api/nodes_test.go` — 新增 `Reset` HTTP 测试。

### 前端修改文件

- `web/src/lib/api.ts` — 新增 `resetNode(id)` API 调用。
- `web/src/routes/nodes/index.tsx` — 操作菜单按状态区分：online 显示 Reset，其他显示 Install Command。
- `web/tests/e2e/layout.spec.ts` — 更新 E2E 测试，覆盖 online 节点 Reset 操作。

---

## Task 1: 新增 ResetNode SQL 查询并生成 Go 代码

**Files:**
- Modify: `panel/internal/db/queries.sql`
- Create: `panel/internal/db/sqlc.yaml`
- Modify: `panel/internal/db/queries.sql.go`（由 sqlc 生成）

**Interfaces:**
- Produces: `Queries.ResetNode(ctx, arg ResetNodeParams) (Node, error)`

- [ ] **Step 1: 在 `queries.sql` 末尾新增 `ResetNode` 查询**

```sql
-- name: ResetNode :one
UPDATE nodes SET token_hash = ?, token_used = FALSE, status = 'pending' WHERE id = ?
RETURNING id, name, platform, status, token_hash, system_info, token_used, last_seen_at, created_at;
```

- [ ] **Step 2: 重新创建 `panel/internal/db/sqlc.yaml`**

```yaml
version: "2"
sql:
  - schema: "schema.sql"
    queries: "queries.sql"
    engine: "sqlite"
    gen:
      go:
        package: "db"
        out: "."
        emit_json_tags: true
        emit_prepared_queries: false
        emit_interface: false
        emit_exact_table_names: false
        emit_empty_slices: false
        emit_exported_queries: false
```

- [ ] **Step 3: 运行 sqlc generate 重新生成 Go 代码**

Run: `cd panel/internal/db && sqlc generate`
Expected: `queries.sql.go` 被更新，新增 `ResetNode` 相关代码，无报错。

- [ ] **Step 4: 验证生成的代码可编译**

Run: `cd panel && go build ./...`
Expected: 编译成功。

- [ ] **Step 5: Commit**

```bash
git add panel/internal/db/queries.sql panel/internal/db/sqlc.yaml panel/internal/db/queries.sql.go
git commit -m "feat(db): add ResetNode query"
```

---

## Task 2: 新增 node.Service.Reset 方法

**Files:**
- Modify: `panel/internal/node/node.go`

**Interfaces:**
- Consumes: `auth.GenerateInstallToken`, `sha256.Sum256`, `db.ResetNode`
- Produces: `Service.Reset(ctx context.Context, id, jwtSecret string, expireHours int) (*Node, string, error)`

- [ ] **Step 1: 在 `RotateToken` 方法后新增 `Reset` 方法**

```go
func (s *Service) Reset(ctx context.Context, id, jwtSecret string, expireHours int) (*Node, string, error) {
	if _, err := s.queries.GetNode(ctx, id); err != nil {
		return nil, "", err
	}

	token, err := auth.GenerateInstallToken(jwtSecret, id, expireHours)
	if err != nil {
		return nil, "", err
	}

	hashBytes := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hashBytes[:])

	row, err := s.queries.ResetNode(ctx, db.ResetNodeParams{
		TokenHash: tokenHash,
		ID:        id,
	})
	if err != nil {
		return nil, "", err
	}

	n := fromDB(row)
	return &n, token, nil
}
```

- [ ] **Step 2: 运行后端单元测试确认无回归**

Run: `cd panel && go test ./internal/node/...`
Expected: 现有测试通过。

- [ ] **Step 3: Commit**

```bash
git add panel/internal/node/node.go
git commit -m "feat(node): add Reset service method"
```

---

## Task 3: 新增 NodesHandler.Reset HTTP 接口

**Files:**
- Modify: `panel/internal/api/nodes.go`

**Interfaces:**
- Consumes: `node.Service.Reset`
- Produces: `POST /api/v1/nodes/{id}/reset` → `{ install_command }`

- [ ] **Step 1: 在 `Register` 中新增路由**

将：

```go
func (h *NodesHandler) Register(r *mux.Router) {
	r.HandleFunc("/nodes", h.Create).Methods("POST")
	r.HandleFunc("/nodes", h.List).Methods("GET")
	r.HandleFunc("/nodes/{id}", h.Get).Methods("GET")
	r.HandleFunc("/nodes/{id}/rotate-token", h.RotateToken).Methods("POST")
}
```

替换为：

```go
func (h *NodesHandler) Register(r *mux.Router) {
	r.HandleFunc("/nodes", h.Create).Methods("POST")
	r.HandleFunc("/nodes", h.List).Methods("GET")
	r.HandleFunc("/nodes/{id}", h.Get).Methods("GET")
	r.HandleFunc("/nodes/{id}/rotate-token", h.RotateToken).Methods("POST")
	r.HandleFunc("/nodes/{id}/reset", h.Reset).Methods("POST")
}
```

- [ ] **Step 2: 在 `RotateToken` 方法后新增 `Reset` handler**

```go
func (h *NodesHandler) Reset(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	panelURL := r.Header.Get("X-Panel-URL")
	if panelURL == "" {
		panelURL = "https://panel.example.com"
	}

	n, token, err := h.svc.Reset(r.Context(), vars["id"], h.cfg.JWT.Secret, h.cfg.JWT.ExpireHours)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "node not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := buildInstallCommand(n.Platform, panelURL, token)
	respondJSON(w, rotateTokenResponse{InstallCommand: cmd})
}
```

- [ ] **Step 3: 编译检查**

Run: `cd panel && go build ./...`
Expected: 编译成功。

- [ ] **Step 4: Commit**

```bash
git add panel/internal/api/nodes.go
git commit -m "feat(api): add POST /nodes/{id}/reset endpoint"
```

---

## Task 4: 后端 Reset 测试

**Files:**
- Modify: `panel/internal/node/node_test.go`
- Modify: `panel/internal/api/nodes_test.go`

**Interfaces:**
- Consumes: `Service.Reset`, `NodesHandler.Reset`
- Produces: 验证 Reset 更新 token_hash、status 为 pending、原 Token 失效的测试用例

- [ ] **Step 1: 在 `node_test.go` 中新增 `Reset` 测试**

```go
func TestServiceReset(t *testing.T) {
	q, cleanup := newTestQueries(t)
	defer cleanup()

	svc := NewService(q)
	ctx := context.Background()

	n, token, err := svc.Create(ctx, "reset-node", "linux", "secret", 24)
	require.NoError(t, err)

	// Simulate agent going online by marking token used and updating status.
	require.NoError(t, q.MarkInstallTokenUsed(ctx, n.ID))
	require.NoError(t, q.UpdateNodeStatus(ctx, db.UpdateNodeStatusParams{Status: "online", ID: n.ID}))

	resetNode, newToken, err := svc.Reset(ctx, n.ID, "secret", 24)
	require.NoError(t, err)
	require.NotEqual(t, token, newToken)
	require.Equal(t, "pending", resetNode.Status)
	require.False(t, resetNode.TokenUsed)

	// Original token hash should no longer match.
	stored, err := q.GetNode(ctx, n.ID)
	require.NoError(t, err)
	require.NotEqual(t, stored.TokenHash, hashToken(token))
	require.Equal(t, stored.TokenHash, hashToken(newToken))
}
```

注意：测试文件中需要能访问 `hashToken` 函数。如果 `hashToken` 在 `api` 包中未导出，可在测试文件中自行定义：

```go
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
```

- [ ] **Step 2: 在 `nodes_test.go` 中新增 HTTP Reset 测试**

```go
func TestNodesHandler_Reset(t *testing.T) {
	h, cleanup := newTestHandler(t)
	defer cleanup()

	ctx := context.Background()
	n, _, err := h.svc.Create(ctx, "reset-http", "linux", h.cfg.JWT.Secret, h.cfg.JWT.ExpireHours)
	require.NoError(t, err)
	require.NoError(t, h.queries.MarkInstallTokenUsed(ctx, n.ID))
	require.NoError(t, h.queries.UpdateNodeStatus(ctx, db.UpdateNodeStatusParams{Status: "online", ID: n.ID}))

	req := httptest.NewRequest("POST", "/nodes/"+n.ID+"/reset", nil)
	req.Header.Set("X-Panel-URL", "http://localhost:8080")
	rr := httptest.NewRecorder()
	h.router.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var resp rotateTokenResponse
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&resp))
	require.Contains(t, resp.InstallCommand, "--token")

	stored, err := h.queries.GetNode(ctx, n.ID)
	require.NoError(t, err)
	require.Equal(t, "pending", stored.Status)
	require.False(t, stored.TokenUsed)
}
```

- [ ] **Step 3: 运行后端测试**

Run: `cd panel && go test ./...`
Expected: 所有测试通过。

- [ ] **Step 4: Commit**

```bash
git add panel/internal/node/node_test.go panel/internal/api/nodes_test.go
git commit -m "test(panel): add Reset endpoint and service tests"
```

---

## Task 5: 前端新增 resetNode API

**Files:**
- Modify: `web/src/lib/api.ts`

**Interfaces:**
- Produces: `api.resetNode(id: string) -> Promise<{ install_command: string }>`

- [ ] **Step 1: 在 `api` 对象中新增 `resetNode` 方法**

在 `rotateToken` 后新增：

```ts
  resetNode: (id: string) =>
    request(`/nodes/${id}/reset`, {
      method: 'POST',
      headers: { 'X-Panel-URL': getDefaultPanelURL() },
    }),
```

- [ ] **Step 2: 运行前端单元测试**

Run: `cd web && bun run test`
Expected: 测试通过。

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/api.ts
git commit -m "feat(web): add resetNode api client"
```

---

## Task 6: 前端操作菜单按状态区分

**Files:**
- Modify: `web/src/routes/nodes/index.tsx`

**Interfaces:**
- Consumes: `api.resetNode`, `handleShowInstallCommand`
- Produces: online 节点显示 Reset，其他状态显示 Install Command

- [ ] **Step 1: 新增 `handleReset` 函数**

在 `handleShowInstallCommand` 函数后新增：

```ts
  const handleReset = async (nodeId: string) => {
    setDialogLoading(true)
    setDialogOpen(true)
    setDialogCommand('')
    setDialogNodeId(nodeId)
    try {
      const data = await api.resetNode(nodeId)
      setDialogCommand(data.install_command)
    } catch (err) {
      setDialogOpen(false)
      setDialogNodeId(null)
      toast({
        title: 'Reset 失败',
        description: err instanceof Error ? err.message : '无法重置节点',
        variant: 'destructive',
      })
    } finally {
      setDialogLoading(false)
    }
  }
```

- [ ] **Step 2: 修改卡片操作菜单**

将卡片渲染中的 DropdownMenu 内容：

```tsx
<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => handleShowInstallCommand(node.id)}>
    Install Command
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => handleShowInstallCommand(node.id)}>
    Rotate Token
  </DropdownMenuItem>
  <DropdownMenuItem asChild>
    <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
      View Details
    </Link>
  </DropdownMenuItem>
</DropdownMenuContent>
```

替换为：

```tsx
<DropdownMenuContent align="end">
  {node.status === 'online' ? (
    <DropdownMenuItem onClick={() => handleReset(node.id)}>
      Reset
    </DropdownMenuItem>
  ) : (
    <DropdownMenuItem onClick={() => handleShowInstallCommand(node.id)}>
      Install Command
    </DropdownMenuItem>
  )}
  <DropdownMenuItem onClick={() => handleShowInstallCommand(node.id)}>
    Rotate Token
  </DropdownMenuItem>
  <DropdownMenuItem asChild>
    <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
      View Details
    </Link>
  </DropdownMenuItem>
</DropdownMenuContent>
```

- [ ] **Step 3: 构建检查**

Run: `cd web && bun run build`
Expected: 编译成功。

- [ ] **Step 4: Commit**

```bash
git add web/src/routes/nodes/index.tsx
git commit -m "feat(web): show Reset for online nodes and Install Command for others"
```

---

## Task 7: 更新前端 E2E 测试

**Files:**
- Modify: `web/tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes: mock API 中的 `mockNodes`
- Produces: 验证 online 节点 Reset 行为、pending/offline 节点 Install Command 行为的测试

- [ ] **Step 1: 扩展 mock API 支持 reset 路由**

在 `mockApi` 函数中新增：

```ts
    const resetMatch = url.match(/\/api\/v1\/nodes\/([^/]+)\/reset$/)
    if (resetMatch && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ install_command: 'curl -sSL http://example.com/install.sh | bash --token reset-token' }),
      })
    }
```

- [ ] **Step 2: 修改 nodes 页面布局测试**

将现有测试替换为以下两个测试：

```ts
  test('online node shows Reset menu and generates new install command', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)

    const onlineCard = page.getByTestId('node-card').filter({ hasText: 'web-server-01' })
    await expect(onlineCard).toBeVisible()
    await onlineCard.getByRole('button', { name: 'Actions' }).click()

    await expect(page.getByRole('menuitem', { name: 'Reset' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Install Command' })).toBeHidden()

    await page.getByRole('menuitem', { name: 'Reset' }).click()
    await expect(page.getByText('Install Command')).toBeVisible()
    await expect(page.locator('pre')).toContainText('--token')
  })

  test('offline node shows Install Command menu', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)

    const offlineCard = page.getByTestId('node-card').filter({ hasText: 'db-server-01' })
    await expect(offlineCard).toBeVisible()
    await offlineCard.getByRole('button', { name: 'Actions' }).click()

    await expect(page.getByRole('menuitem', { name: 'Install Command' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Reset' })).toBeHidden()
  })
```

注意：如果 `getByRole('menuitem', { name: 'Install Command' }).toBeHidden()` 在菜单关闭时不可靠，可改为点击 Reset 后断言命令弹窗。

- [ ] **Step 3: 运行 E2E 测试**

Run: `cd web && bunx playwright test tests/e2e/layout.spec.ts --project=chromium`
Expected: 所有测试通过。

- [ ] **Step 4: Commit**

```bash
git add web/tests/e2e/layout.spec.ts
git commit -m "test(e2e): verify Reset menu for online nodes"
```

---

## Task 8: 全量验证与最终提交

- [ ] **Step 1: 运行后端全量测试**

Run: `cd panel && go test ./...`
Expected: 所有测试通过。

- [ ] **Step 2: 运行前端构建与测试**

Run:
```bash
cd web && bun run build
cd web && bun run test
cd web && bunx playwright test tests/e2e/layout.spec.ts --project=chromium
```
Expected: 全部通过。

- [ ] **Step 3: 检查 diff**

Run: `git diff --stat`
Expected: 改动文件符合预期。

- [ ] **Step 4: 最终提交（如还有未提交改动）**

```bash
git add -A
git commit -m "feat: add node reset functionality"
```

---

## Self-Review

**Spec coverage:**
- [x] 后端新增 Reset 接口 → Task 3
- [x] 后端生成新 Token 并更新 token_hash、token_used、status → Task 1, 2
- [x] 保留 system_info 和 last_seen_at → Task 1 SQL 明确不包含这些字段
- [x] 原 Token 失效 → 通过 token_hash 更新自然实现，Task 4 测试验证
- [x] 前端 online 节点显示 Reset → Task 6
- [x] 前端 pending/offline 节点显示 Install Command → Task 6
- [x] Reset 成功后展示安装命令 → Task 5, 6
- [x] 后端测试 → Task 4
- [x] 前端 E2E 测试 → Task 7
- [x] Git 提交 → 每个 Task 末尾

**Placeholder scan:**
- 无 TBD/TODO
- 所有步骤包含实际代码或命令
- 文件路径精确

**Type一致性：**
- `ResetNodeParams` 由 sqlc 生成
- `Service.Reset` 签名与 `RotateToken` 一致
- `api.resetNode` 返回类型与 `rotateToken` 一致
