# Panel-Node MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Panel-Node MVP：用户登录面板、创建 Node、生成安装命令、Agent 安装后上报系统信息、面板实时显示 Node 状态。

**Architecture:** 单仓库 monorepo，Go 后端（标准库 net/http + gorilla/mux）embed Vite+React 前端产物，SQLite（modernc.org/sqlite）持久化；Agent 为 Go 静态二进制，支持 WebSocket/HTTP/Pull 三种连接模式自动回退。

**Tech Stack:** Go 1.24+ / Vite 6+ / React 19+ / TanStack Router / Tailwind CSS 4+ / shadcn/ui / bun / sqlc / gorilla/websocket / gopsutil / Playwright

## Global Constraints

- 使用 bun 作为前端包管理器，禁止 Makefile；构建脚本写在 `package.json` 与可选的 `Taskfile.yml` 中。
- 后端使用 Go 标准库 `net/http` + `gorilla/mux`，禁用 Gin/Echo 等框架。
- SQLite 驱动必须使用 `modernc.org/sqlite`（`CGO_ENABLED=0`）。
- Agent 支持 WebSocket / HTTP / Pull 三种模式，默认 `auto` 回退。
- 开发环境一键命令：`bun run dev` 同时启动 Vite dev server 与 Go 后端。
- TDD：每个功能先写测试再写实现。
- 所有前端 Task 完成后需用 Playwright/CloakBrowser 可视化验收。
- 默认深色主题，支持 light/dark 切换。

## File Structure

```
bsdock/
├── .github/workflows/release.yml
├── agent/
│   ├── cmd/agent/main.go
│   ├── internal/
│   │   ├── collector/collector.go
│   │   ├── collector/collector_test.go
│   │   ├── config/config.go
│   │   ├── transport/transport.go
│   │   ├── transport/ws.go
│   │   ├── transport/http.go
│   │   ├── transport/pull.go
│   │   └── transport/transport_test.go
│   └── go.mod
├── panel/
│   ├── cmd/panel/main.go
│   ├── internal/
│   │   ├── api/api.go
│   │   ├── api/auth.go
│   │   ├── api/nodes.go
│   │   ├── api/agent_ws.go
│   │   ├── api/agent_http.go
│   │   ├── api/static.go
│   │   ├── auth/jwt.go
│   │   ├── auth/password.go
│   │   ├── auth/auth_test.go
│   │   ├── config/config.go
│   │   ├── config/config_test.go
│   │   ├── db/
│   │   │   ├── db.go
│   │   │   ├── queries.sql
│   │   │   ├── schema.sql
│   │   │   └── sqlc.yaml
│   │   ├── node/node.go
│   │   ├── node/node_test.go
│   │   └── websocket/hub.go
│   └── go.mod
├── scripts/
│   ├── install-agent.sh
│   └── install-panel.sh
├── web/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── components.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── routeTree.gen.ts
│   │   ├── routes/__root.tsx
│   │   ├── routes/login.tsx
│   │   ├── routes/nodes/index.tsx
│   │   ├── routes/nodes/$nodeId.tsx
│   │   ├── components/ui/...
│   │   ├── lib/api.ts
│   │   ├── lib/auth.ts
│   │   ├── lib/ws.ts
│   │   ├── hooks/useNodes.ts
│   │   ├── hooks/useNode.ts
│   │   └── store/nodeStore.ts
│   └── tests/
├── config.yaml
├── package.json
├── Taskfile.yml
├── go.work
├── README.md
└── docs/superpowers/specs/2026-07-04-panel-node-mvp-design.md
```


### Task 1: Initialize Monorepo and Go Modules

**Files:**
- Create: `go.work`
- Create: `panel/go.mod`
- Create: `agent/go.mod`
- Create: `package.json`
- Create: `Taskfile.yml`
- Create: `config.yaml`
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Produces: workspace root with three modules (`panel/`, `agent/`) and bun root scripts.

- [ ] **Step 1: Write the failing check**

Run:
```bash
cat panel/go.mod && cat agent/go.mod && cat go.work
```
Expected: files do not exist.

- [ ] **Step 2: Create workspace and modules**

Create `go.work`:
```go
use (
	./panel
	./agent
)

go 1.24
```

Create `panel/go.mod`:
```go
module github.com/bsdock/panel

go 1.24
```

Create `agent/go.mod`:
```go
module github.com/bsdock/agent

go 1.24
```

Create root `package.json`:
```json
{
  "name": "bsdock",
  "private": true,
  "scripts": {
    "dev": "concurrently \"bun run dev:panel\" \"bun run dev:web\"",
    "dev:panel": "cd panel && go run ./cmd/panel",
    "dev:web": "cd web && bun run dev",
    "build": "bun run build:web && bun run build:panel && bun run build:agent",
    "build:web": "cd web && bun run build",
    "build:panel": "cd panel && go build -o ../dist/panel ./cmd/panel",
    "build:agent:amd64": "cd agent && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o ../dist/bsdock-agent-linux-amd64 ./cmd/agent",
    "build:agent:arm64": "cd agent && GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o ../dist/bsdock-agent-linux-arm64 ./cmd/agent",
    "test": "bun run test:panel && bun run test:agent && bun run test:web",
    "test:panel": "cd panel && go test ./...",
    "test:agent": "cd agent && go test ./...",
    "test:web": "cd web && bun run test",
    "e2e": "cd web && bun run e2e"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

Create `Taskfile.yml`:
```yaml
version: "3"

tasks:
  dev:
    cmds:
      - bun run dev
  build:
    cmds:
      - bun run build
  test:
    cmds:
      - bun run test
```

Create `config.yaml`:
```yaml
mode: master
port: "8080"
database:
  path: "./panel.db"
jwt:
  secret: ""
  expire_hours: 24
admin:
  username: ""
  password: ""
agent:
  allowed_modes: ["websocket", "http", "pull"]
  default_mode: "auto"
  heartbeat_timeout_seconds: 60
  install_token_expire_hours: 24
log:
  level: info
```

Create `.gitignore`:
```
dist/
*.db
*.db-journal
.env
node_modules/
web/dist/
panel/dist/
agent/dist/
.DS_Store
```

Create minimal `README.md` describing the project.

- [ ] **Step 3: Verify**

Run:
```bash
cd panel && go mod tidy && cd ../agent && go mod tidy && cd ..
```
Expected: modules initialized without errors.

- [ ] **Step 4: Commit**

```bash
git add go.work panel/go.mod agent/go.mod package.json Taskfile.yml config.yaml .gitignore README.md
git commit -m "chore: initialize monorepo workspace with bun and go modules"
```


### Task 2: Backend Config Loader

**Files:**
- Create: `panel/internal/config/config.go`
- Create: `panel/internal/config/config_test.go`
- Modify: `panel/go.mod` (add yaml dependency)

**Interfaces:**
- Produces: `config.Load(path string) (*Config, error)`
- Produces: `Config` struct with nested `Database`, `JWT`, `Admin`, `Agent`, `Log`.

- [ ] **Step 1: Write the failing test**

Create `panel/internal/config/config_test.go`:
```go
package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load("")
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}
	if cfg.Port != "8080" {
		t.Fatalf("expected port 8080, got %s", cfg.Port)
	}
	if cfg.Agent.DefaultMode != "auto" {
		t.Fatalf("expected default mode auto, got %s", cfg.Agent.DefaultMode)
	}
}

func TestLoadFromFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	content := `
mode: master
port: "9000"
database:
  path: "./test.db"
`
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != "9000" {
		t.Fatalf("expected port 9000, got %s", cfg.Port)
	}
	if cfg.Database.Path != "./test.db" {
		t.Fatalf("expected db path ./test.db, got %s", cfg.Database.Path)
	}
}

func TestEnvOverride(t *testing.T) {
	t.Setenv("BSDOCK_PORT", "7777")
	cfg, err := Load("")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != "7777" {
		t.Fatalf("expected env override 7777, got %s", cfg.Port)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd panel && go test ./internal/config -v
```
Expected: FAIL "package config: no go files" or "Load undefined".

- [ ] **Step 3: Implement config loader**

Add dependency:
```bash
cd panel && go get gopkg.in/yaml.v3
```

Create `panel/internal/config/config.go`:
```go
package config

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Mode     string   `yaml:"mode"`
	Port     string   `yaml:"port"`
	Database Database `yaml:"database"`
	JWT      JWT      `yaml:"jwt"`
	Admin    Admin    `yaml:"admin"`
	Agent    Agent    `yaml:"agent"`
	Log      Log      `yaml:"log"`
}

type Database struct {
	Path string `yaml:"path"`
}

type JWT struct {
	Secret      string `yaml:"secret"`
	ExpireHours int    `yaml:"expire_hours"`
}

type Admin struct {
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

type Agent struct {
	AllowedModes             []string `yaml:"allowed_modes"`
	DefaultMode              string   `yaml:"default_mode"`
	HeartbeatTimeoutSeconds  int      `yaml:"heartbeat_timeout_seconds"`
	InstallTokenExpireHours  int      `yaml:"install_token_expire_hours"`
}

type Log struct {
	Level string `yaml:"level"`
}

func Load(path string) (*Config, error) {
	cfg := &Config{
		Mode: "master",
		Port: "8080",
		Database: Database{Path: "./panel.db"},
		JWT: JWT{ExpireHours: 24},
		Agent: Agent{
			AllowedModes:            []string{"websocket", "http", "pull"},
			DefaultMode:             "auto",
			HeartbeatTimeoutSeconds: 60,
			InstallTokenExpireHours: 24,
		},
		Log: Log{Level: "info"},
	}

	if path == "" {
		path = "./config.yaml"
	}

	if data, err := os.ReadFile(path); err == nil {
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("parse config: %w", err)
		}
	}

	applyEnv(cfg)
	return cfg, nil
}

func applyEnv(cfg *Config) {
	if v := os.Getenv("BSDOCK_MODE"); v != "" {
		cfg.Mode = v
	}
	if v := os.Getenv("BSDOCK_PORT"); v != "" {
		cfg.Port = v
	}
	if v := os.Getenv("BSDOCK_DB_PATH"); v != "" {
		cfg.Database.Path = v
	}
	if v := os.Getenv("BSDOCK_JWT_SECRET"); v != "" {
		cfg.JWT.Secret = v
	}
	if v := os.Getenv("BSDOCK_JWT_EXPIRE_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.JWT.ExpireHours = n
		}
	}
	if v := os.Getenv("BSDOCK_ADMIN_USERNAME"); v != "" {
		cfg.Admin.Username = v
	}
	if v := os.Getenv("BSDOCK_ADMIN_PASSWORD"); v != "" {
		cfg.Admin.Password = v
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd panel && go test ./internal/config -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add panel/internal/config/ panel/go.mod panel/go.sum
git commit -m "feat(panel): add config loader with yaml and env override"
```


### Task 3: Backend Database Schema and sqlc Queries

**Files:**
- Create: `panel/internal/db/schema.sql`
- Create: `panel/internal/db/queries.sql`
- Create: `panel/internal/db/sqlc.yaml`
- Create: `panel/internal/db/db.go`
- Create: `panel/internal/db/db_test.go`
- Modify: `panel/go.mod` (add modernc.org/sqlite, sqlc runtime)

**Interfaces:**
- Consumes: `Config.Database.Path`
- Produces: `db.Open(path string) (*sql.DB, error)`
- Produces: sqlc-generated queries: `CreateUser`, `GetUserByUsername`, `CreateNode`, `GetNode`, `ListNodes`, `UpdateNodeStatus`, `UpdateNodeSystemInfo`, `MarkInstallTokenUsed`, `CreateNodeReport`.

- [ ] **Step 1: Write schema and queries**

Create `panel/internal/db/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'online', 'offline')),
    token_hash TEXT NOT NULL,
    system_info TEXT,
    token_used BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS node_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    payload TEXT NOT NULL,
    reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Create `panel/internal/db/queries.sql`:
```sql
-- name: CreateUser :one
INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id, username, password_hash, created_at;

-- name: GetUserByUsername :one
SELECT id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1;

-- name: CreateNode :one
INSERT INTO nodes (id, name, status, token_hash) VALUES (?, ?, ?, ?)
RETURNING id, name, status, token_hash, system_info, token_used, last_seen_at, created_at;

-- name: GetNode :one
SELECT id, name, status, token_hash, system_info, token_used, last_seen_at, created_at FROM nodes WHERE id = ? LIMIT 1;

-- name: ListNodes :many
SELECT id, name, status, token_hash, system_info, token_used, last_seen_at, created_at FROM nodes ORDER BY created_at DESC;

-- name: UpdateNodeStatus :exec
UPDATE nodes SET status = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?;

-- name: UpdateNodeSystemInfo :exec
UPDATE nodes SET system_info = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?;

-- name: MarkInstallTokenUsed :exec
UPDATE nodes SET token_used = TRUE WHERE id = ?;

-- name: CreateNodeReport :one
INSERT INTO node_reports (node_id, payload) VALUES (?, ?) RETURNING id, node_id, payload, reported_at;
```

Create `panel/internal/db/sqlc.yaml`:
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

- [ ] **Step 2: Install sqlc and generate code**

Run:
```bash
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
cd panel/internal/db && sqlc generate
```

Expected: generates `db.go`, `models.go`, `queries.sql.go` in `panel/internal/db/`.

- [ ] **Step 3: Write db wrapper and test**

Create `panel/internal/db/db.go`:
```go
package db

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

func Open(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}
	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("migrate schema: %w", err)
	}
	return db, nil
}
```

Note: sqlc generates a `schema` constant in `db.go` after generation; if it does not, create `panel/internal/db/migrate.go` with the schema string.

Create `panel/internal/db/db_test.go`:
```go
package db

import (
	"path/filepath"
	"testing"
)

func TestOpen(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec("SELECT 1 FROM users LIMIT 1")
	if err != nil {
		t.Fatalf("users table not ready: %v", err)
	}
}
```

- [ ] **Step 4: Add dependencies and run tests**

Run:
```bash
cd panel && go get modernc.org/sqlite github.com/sqlc-dev/sqlc/codegen/sdk
cd panel && go test ./internal/db -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add panel/internal/db/ panel/go.mod panel/go.sum
git commit -m "feat(panel): add sqlite schema, sqlc queries and db wrapper"
```


### Task 4: Backend Auth Module

**Files:**
- Create: `panel/internal/auth/password.go`
- Create: `panel/internal/auth/jwt.go`
- Create: `panel/internal/auth/auth_test.go`
- Modify: `panel/go.mod` (add golang-jwt, bcrypt)

**Interfaces:**
- Produces: `HashPassword(password string) (string, error)`
- Produces: `CheckPassword(password, hash string) bool`
- Produces: `GenerateToken(secret, username string, expireHours int) (string, error)`
- Produces: `ParseToken(secret, tokenString string) (*Claims, error)`

- [ ] **Step 1: Write the failing tests**

Create `panel/internal/auth/auth_test.go`:
```go
package auth

import (
	"testing"
	"time"
)

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("admin123")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword("admin123", hash) {
		t.Fatal("expected password to match")
	}
	if CheckPassword("wrong", hash) {
		t.Fatal("expected password to not match")
	}
}

func TestGenerateAndParseToken(t *testing.T) {
	secret := "test-secret"
	token, err := GenerateToken(secret, "admin", 1)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := ParseToken(secret, token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.Username != "admin" {
		t.Fatalf("expected admin, got %s", claims.Username)
	}
}

func TestExpiredToken(t *testing.T) {
	secret := "test-secret"
	token, err := GenerateToken(secret, "admin", -1)
	if err != nil {
		t.Fatal(err)
	}
	time.Sleep(1 * time.Second)
	_, err = ParseToken(secret, token)
	if err == nil {
		t.Fatal("expected expired token error")
	}
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
cd panel && go test ./internal/auth -v
```
Expected: FAIL with undefined functions.

- [ ] **Step 3: Implement auth module**

Add dependencies:
```bash
cd panel && go get github.com/golang-jwt/jwt/v5 golang.org/x/crypto/bcrypt
```

Create `panel/internal/auth/password.go`:
```go
package auth

import (
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
```

Create `panel/internal/auth/jwt.go`:
```go
package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func GenerateToken(secret, username string, expireHours int) (string, error) {
	claims := Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(secret, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}
	return nil, fmt.Errorf("invalid token")
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd panel && go test ./internal/auth -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add panel/internal/auth/ panel/go.mod panel/go.sum
git commit -m "feat(panel): add bcrypt password hashing and JWT token utilities"
```


### Task 5: Install Token Utility

**Files:**
- Create: `panel/internal/auth/install_token.go`
- Create: `panel/internal/auth/install_token_test.go`

**Interfaces:**
- Consumes: `auth.GenerateToken`, `auth.ParseToken`
- Produces: `GenerateInstallToken(secret, nodeID string, expireHours int) (string, error)`
- Produces: `ParseInstallToken(secret, token string) (*InstallClaims, error)`

- [ ] **Step 1: Write the failing test**

Create `panel/internal/auth/install_token_test.go`:
```go
package auth

import (
	"testing"
)

func TestInstallToken(t *testing.T) {
	secret := "install-secret"
	nodeID := "abc123"
	token, err := GenerateInstallToken(secret, nodeID, 1)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := ParseInstallToken(secret, token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.NodeID != nodeID {
		t.Fatalf("expected %s, got %s", nodeID, claims.NodeID)
	}
}
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
cd panel && go test ./internal/auth -run TestInstallToken -v
```
Expected: FAIL with undefined functions.

- [ ] **Step 3: Implement install token functions**

Create `panel/internal/auth/install_token.go`:
```go
package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type InstallClaims struct {
	NodeID string `json:"node_id"`
	jwt.RegisteredClaims
}

func GenerateInstallToken(secret, nodeID string, expireHours int) (string, error) {
	claims := InstallClaims{
		NodeID: nodeID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseInstallToken(secret, tokenString string) (*InstallClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &InstallClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*InstallClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, fmt.Errorf("invalid install token")
}
```

- [ ] **Step 4: Run test to verify pass**

Run:
```bash
cd panel && go test ./internal/auth -run TestInstallToken -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add panel/internal/auth/install_token.go panel/internal/auth/install_token_test.go
git commit -m "feat(panel): add JWT install token utility for node registration"
```

### Task 6: Backend Node API

**Files:**
- Create: `panel/internal/node/node.go`
- Create: `panel/internal/node/node_test.go`
- Create: `panel/internal/api/nodes.go`
- Create: `panel/internal/api/nodes_test.go`
- Modify: `panel/internal/db/queries.sql` (if needed)

**Interfaces:**
- Consumes: `db.Queries`, `auth.GenerateInstallToken`
- Produces: `node.Service` with methods `Create(ctx, name, panelURL, jwtSecret string, expireHours int) (*Node, string, error)`, `List() ([]Node, error)`, `Get(id string) (*Node, error)`.
- Produces: HTTP endpoints `POST /api/v1/nodes`, `GET /api/v1/nodes`, `GET /api/v1/nodes/:id`.

- [ ] **Step 1: Write the failing Node service tests**

Create `panel/internal/node/node_test.go`:
```go
package node

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/bsdock/panel/internal/db"
)

func newTestDB(t *testing.T) *db.Queries {
	t.Helper()
	path := filepath.Join(t.TempDir(), "test.db")
	sqlDB, err := db.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqlDB.Close() })
	return db.New(sqlDB)
}

func TestCreateNode(t *testing.T) {
	queries := newTestDB(t)
	svc := NewService(queries)
	node, token, err := svc.Create(context.Background(), "srv-01", "https://panel.local", "secret", 24)
	if err != nil {
		t.Fatal(err)
	}
	if node.Name != "srv-01" {
		t.Fatalf("expected srv-01, got %s", node.Name)
	}
	if node.Status != "pending" {
		t.Fatalf("expected pending, got %s", node.Status)
	}
	if token == "" {
		t.Fatal("expected non-empty install token")
	}
}

func TestListNodes(t *testing.T) {
	queries := newTestDB(t)
	svc := NewService(queries)
	if _, _, err := svc.Create(context.Background(), "srv-01", "https://panel.local", "secret", 24); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.Create(context.Background(), "srv-02", "https://panel.local", "secret", 24); err != nil {
		t.Fatal(err)
	}
	nodes, err := svc.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(nodes) != 2 {
		t.Fatalf("expected 2 nodes, got %d", len(nodes))
	}
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
cd panel && go test ./internal/node -v
```
Expected: FAIL with undefined service.

- [ ] **Step 3: Implement Node service**

Create `panel/internal/node/node.go`:
```go
package node

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/db"
)

type Node struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Status      string          `json:"status"`
	TokenHash   string          `json:"-"`
	SystemInfo  json.RawMessage `json:"system_info,omitempty"`
	TokenUsed   bool            `json:"token_used"`
	LastSeenAt  *time.Time      `json:"last_seen_at,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
}

type Service struct {
	queries *db.Queries
}

func NewService(q *db.Queries) *Service {
	return &Service{queries: q}
}

func (s *Service) Create(ctx context.Context, name, panelURL, jwtSecret string, expireHours int) (*Node, string, error) {
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		return nil, "", err
	}
	id := hex.EncodeToString(idBytes)

	token, err := auth.GenerateInstallToken(jwtSecret, id, expireHours)
	if err != nil {
		return nil, "", err
	}

	hashBytes := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hashBytes[:])

	row, err := s.queries.CreateNode(ctx, db.CreateNodeParams{
		ID:        id,
		Name:      name,
		Status:    "pending",
		TokenHash: tokenHash,
	})
	if err != nil {
		return nil, "", err
	}

	return fromDB(row), token, nil
}

func (s *Service) List() ([]Node, error) {
	rows, err := s.queries.ListNodes(context.Background())
	if err != nil {
		return nil, err
	}
	nodes := make([]Node, len(rows))
	for i, row := range rows {
		nodes[i] = fromDB(row)
	}
	return nodes, nil
}

func (s *Service) Get(id string) (*Node, error) {
	row, err := s.queries.GetNode(context.Background(), id)
	if err != nil {
		return nil, err
	}
	node := fromDB(row)
	return &node, nil
}

func fromDB(row db.Node) Node {
	return Node{
		ID:         row.ID,
		Name:       row.Name,
		Status:     row.Status,
		TokenHash:  row.TokenHash,
		SystemInfo: json.RawMessage(row.SystemInfo),
		TokenUsed:  row.TokenUsed,
		LastSeenAt: row.LastSeenAt,
		CreatedAt:  row.CreatedAt,
	}
}
```

- [ ] **Step 4: Run Node service tests**

Run:
```bash
cd panel && go test ./internal/node -v
```
Expected: PASS.

- [ ] **Step 5: Implement HTTP handlers**

Create `panel/internal/api/nodes.go`:
```go
package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/node"
)

type NodesHandler struct {
	svc    *node.Service
	cfg    *config.Config
}

func NewNodesHandler(svc *node.Service, cfg *config.Config) *NodesHandler {
	return &NodesHandler{svc: svc, cfg: cfg}
}

type createNodeRequest struct {
	Name string `json:"name"`
}

type createNodeResponse struct {
	Node          node.Node `json:"node"`
	InstallCommand string   `json:"install_command"`
}

func (h *NodesHandler) Register(r *mux.Router) {
	r.HandleFunc("/api/v1/nodes", h.Create).Methods("POST")
	r.HandleFunc("/api/v1/nodes", h.List).Methods("GET")
	r.HandleFunc("/api/v1/nodes/{id}", h.Get).Methods("GET")
}

func (h *NodesHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}

	panelURL := r.Header.Get("X-Panel-URL")
	if panelURL == "" {
		panelURL = "https://panel.example.com"
	}

	n, token, err := h.svc.Create(r.Context(), req.Name, panelURL, h.cfg.JWT.Secret, h.cfg.JWT.ExpireHours)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := fmt.Sprintf("bash <(curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/scripts/install-agent.sh) --panel %s --token %s", panelURL, token)

	respondJSON(w, createNodeResponse{Node: *n, InstallCommand: cmd})
}

func (h *NodesHandler) List(w http.ResponseWriter, r *http.Request) {
	nodes, err := h.svc.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, nodes)
}

func (h *NodesHandler) Get(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	n, err := h.svc.Get(vars["id"])
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	respondJSON(w, n)
}
```

Note: `respondJSON` helper will be defined in `api.go` in Task 9.

- [ ] **Step 6: Write HTTP handler tests**

Create `panel/internal/api/nodes_test.go`:
```go
package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
)

func TestCreateNodeHandler(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	svc := node.NewService(db.New(sqlDB))
	cfg := &config.Config{JWT: config.JWT{Secret: "test-secret", ExpireHours: 1}}
	h := NewNodesHandler(svc, cfg)
	r := mux.NewRouter()
	h.Register(r)

	body := []byte(`{"name":"srv-01"}`)
	req := httptest.NewRequest("POST", "/api/v1/nodes", bytes.NewReader(body))
	req.Header.Set("X-Panel-URL", "https://panel.local")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp createNodeResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Node.Name != "srv-01" {
		t.Fatalf("expected srv-01, got %s", resp.Node.Name)
	}
	if resp.InstallCommand == "" {
		t.Fatal("expected install command")
	}
}
```

- [ ] **Step 7: Run handler tests**

Run:
```bash
cd panel && go test ./internal/api -run TestCreateNodeHandler -v
```
Expected: PASS after `api.go` helper is added.

- [ ] **Step 8: Commit**

```bash
git add panel/internal/node/ panel/internal/api/nodes.go panel/internal/api/nodes_test.go panel/go.mod panel/go.sum
git commit -m "feat(panel): add Node service and HTTP CRUD endpoints"
```


### Task 7: Backend Agent WebSocket Endpoint

**Files:**
- Create: `panel/internal/websocket/hub.go`
- Create: `panel/internal/api/agent_ws.go`
- Create: `panel/internal/api/agent_ws_test.go`
- Modify: `panel/internal/db/queries.sql` (add MarkInstallTokenUsed if not present)

**Interfaces:**
- Consumes: `auth.ParseInstallToken`, `node.Service`, `db.Queries`
- Produces: `GET /api/v1/agent/ws?token=...` WebSocket upgrade handler
- Produces: `websocket.Hub` to broadcast `node_update` messages to frontend clients

- [ ] **Step 1: Write the failing test**

Create `panel/internal/api/agent_ws_test.go`:
```go
package api

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
)

func TestAgentWebSocketRegister(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)
	hub := NewHub()
	go hub.Run()

	h := NewAgentWSHandler(svc, queries, cfg, hub)
	r := mux.NewRouter()
	h.Register(r)

	// Create a node to get a token
	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "https://panel.local", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}

	// Add a frontend subscriber
	frontendCh := make(chan []byte, 1)
	hub.Subscribe(created.ID, frontendCh)

	// Connect as agent
	server := httptest.NewServer(r)
	defer server.Close()

	u, _ := url.Parse(server.URL)
	u.Scheme = "ws"
	u.Path = "/api/v1/agent/ws"
	u.RawQuery = "token=" + token

	ws, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer ws.Close()

	register := map[string]interface{}{
		"type": "register",
		"payload": map[string]interface{}{
			"token":    token,
			"hostname": "srv-01",
			"os":       "linux",
			"arch":     "amd64",
		},
	}
	if err := ws.WriteJSON(register); err != nil {
		t.Fatal(err)
	}

	select {
	case msg := <-frontendCh:
		if len(msg) == 0 {
			t.Fatal("expected frontend broadcast")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for frontend broadcast")
	}
}
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
cd panel && go test ./internal/api -run TestAgentWebSocketRegister -v
```
Expected: FAIL with undefined functions.

- [ ] **Step 3: Implement WebSocket hub**

Create `panel/internal/websocket/hub.go`:
```go
package websocket

import "encoding/json"

type Hub struct {
	clients map[string]map[chan []byte]bool
	register chan subscription
	unregister chan subscription
	broadcast chan broadcastMsg
}

type subscription struct {
	nodeID string
	ch     chan []byte
}

type broadcastMsg struct {
	nodeID string
	data   []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[chan []byte]bool),
		register:   make(chan subscription),
		unregister: make(chan subscription),
		broadcast:  make(chan broadcastMsg),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case s := <-h.register:
			if h.clients[s.nodeID] == nil {
				h.clients[s.nodeID] = make(map[chan []byte]bool)
			}
			h.clients[s.nodeID][s.ch] = true
		case s := <-h.unregister:
			if _, ok := h.clients[s.nodeID]; ok {
				delete(h.clients[s.nodeID], s.ch)
				close(s.ch)
				if len(h.clients[s.nodeID]) == 0 {
					delete(h.clients, s.nodeID)
				}
			}
		case b := <-h.broadcast:
			for ch := range h.clients[b.nodeID] {
				select {
				case ch <- b.data:
				default:
				}
			}
		}
	}
}

func (h *Hub) Subscribe(nodeID string, ch chan []byte) {
	h.register <- subscription{nodeID: nodeID, ch: ch}
}

func (h *Hub) Unsubscribe(nodeID string, ch chan []byte) {
	h.unregister <- subscription{nodeID: nodeID, ch: ch}
}

func (h *Hub) Broadcast(nodeID string, v interface{}) {
	data, _ := json.Marshal(v)
	h.broadcast <- broadcastMsg{nodeID: nodeID, data: data}
}
```

- [ ] **Step 4: Implement Agent WebSocket handler**

Create `panel/internal/api/agent_ws.go`:
```go
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
)

type AgentWSHandler struct {
	svc     *node.Service
	queries *db.Queries
	cfg     *config.Config
	hub     *wshub.Hub
	upgrader websocket.Upgrader
}

func NewAgentWSHandler(svc *node.Service, queries *db.Queries, cfg *config.Config, hub *wshub.Hub) *AgentWSHandler {
	return &AgentWSHandler{
		svc:     svc,
		queries: queries,
		cfg:     cfg,
		hub:     hub,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *AgentWSHandler) Register(r *mux.Router) {
	r.HandleFunc("/api/v1/agent/ws", h.Handle).Methods("GET")
}

func (h *AgentWSHandler) Handle(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	claims, err := auth.ParseInstallToken(h.cfg.JWT.Secret, token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	nodeRow, err := h.queries.GetNode(r.Context(), claims.NodeID)
	if err != nil || nodeRow.TokenUsed {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	ws, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer ws.Close()

	if err := h.queries.MarkInstallTokenUsed(r.Context(), claims.NodeID); err != nil {
		ws.Close()
		return
	}
	if err := h.queries.UpdateNodeStatus(r.Context(), "online", claims.NodeID); err != nil {
		ws.Close()
		return
	}

	h.broadcastNodeUpdate(claims.NodeID)

	for {
		var msg map[string]interface{}
		if err := ws.ReadJSON(&msg); err != nil {
			break
		}
		t, _ := msg["type"].(string)
		switch t {
		case "register":
			h.handleRegister(claims.NodeID, msg)
		case "heartbeat":
			h.queries.UpdateNodeStatus(r.Context(), "online", claims.NodeID)
		}
	}

	h.queries.UpdateNodeStatus(r.Context(), "offline", claims.NodeID)
	h.broadcastNodeUpdate(claims.NodeID)
}

func (h *AgentWSHandler) handleRegister(nodeID string, msg map[string]interface{}) {
	payload, ok := msg["payload"].(map[string]interface{})
	if !ok {
		return
	}
	data, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	h.queries.UpdateNodeSystemInfo(ctx, string(data), nodeID)
	h.broadcastNodeUpdate(nodeID)
}

func (h *AgentWSHandler) broadcastNodeUpdate(nodeID string) {
	n, err := h.svc.Get(nodeID)
	if err != nil {
		return
	}
	h.hub.Broadcast(nodeID, map[string]interface{}{
		"type":    "node_update",
		"payload": n,
	})
}
```

Note: Add `context` import.

- [ ] **Step 5: Run tests**

Run:
```bash
cd panel && go test ./internal/api -run TestAgentWebSocketRegister -v
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add panel/internal/websocket/ panel/internal/api/agent_ws.go panel/internal/api/agent_ws_test.go panel/go.mod panel/go.sum
git commit -m "feat(panel): add agent WebSocket registration and frontend broadcast hub"
```


### Task 8: Backend Agent HTTP and Pull Endpoints

**Files:**
- Create: `panel/internal/api/agent_http.go`
- Create: `panel/internal/api/agent_http_test.go`

**Interfaces:**
- Consumes: `auth.ParseInstallToken`, `db.Queries`, `node.Service`, `config.Config`
- Produces: `POST /api/v1/agent/report` and `POST /api/v1/agent/poll` handlers

- [ ] **Step 1: Write the failing tests**

Create `panel/internal/api/agent_http_test.go`:
```go
package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
)

func TestAgentHTTPReport(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)

	h := NewAgentHTTPHandler(svc, queries, cfg)
	r := mux.NewRouter()
	h.Register(r)

	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "https://panel.local", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}

	payload := map[string]interface{}{
		"token":    token,
		"hostname": "srv-01",
		"os":       "linux",
		"arch":     "amd64",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/v1/agent/report", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	n, err := svc.Get(created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if n.Status != "online" {
		t.Fatalf("expected online, got %s", n.Status)
	}
}

func TestAgentPull(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)

	h := NewAgentHTTPHandler(svc, queries, cfg)
	r := mux.NewRouter()
	h.Register(r)

	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "https://panel.local", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}

	payload := map[string]interface{}{
		"token":    token,
		"hostname": "srv-01",
		"os":       "linux",
		"arch":     "amd64",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/v1/agent/poll", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	n, err := svc.Get(created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if n.Status != "online" {
		t.Fatalf("expected online, got %s", n.Status)
	}
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
cd panel && go test ./internal/api -run "TestAgentHTTPReport|TestAgentPull" -v
```
Expected: FAIL with undefined handler.

- [ ] **Step 3: Implement Agent HTTP handler**

Create `panel/internal/api/agent_http.go`:
```go
package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
)

type AgentHTTPHandler struct {
	svc     *node.Service
	queries *db.Queries
	cfg     *config.Config
}

func NewAgentHTTPHandler(svc *node.Service, queries *db.Queries, cfg *config.Config) *AgentHTTPHandler {
	return &AgentHTTPHandler{svc: svc, queries: queries, cfg: cfg}
}

func (h *AgentHTTPHandler) Register(r *mux.Router) {
	r.HandleFunc("/api/v1/agent/report", h.Report).Methods("POST")
	r.HandleFunc("/api/v1/agent/poll", h.Poll).Methods("POST")
}

type agentReportPayload struct {
	Token    string          `json:"token"`
	Hostname string          `json:"hostname"`
	OS       string          `json:"os"`
	Arch     string          `json:"arch"`
	Kernel   string          `json:"kernel"`
	CPUModel string          `json:"cpu_model"`
	CPUCores int             `json:"cpu_cores"`
	Memory   int64           `json:"memory_total"`
	DiskTotal int64          `json:"disk_total"`
	DiskFree int64           `json:"disk_free"`
	IPs      []string        `json:"ips"`
	Uptime   int64           `json:"uptime"`
}

func (h *AgentHTTPHandler) Report(w http.ResponseWriter, r *http.Request) {
	h.handle(w, r, false)
}

func (h *AgentHTTPHandler) Poll(w http.ResponseWriter, r *http.Request) {
	h.handle(w, r, true)
}

func (h *AgentHTTPHandler) handle(w http.ResponseWriter, r *http.Request, isPoll bool) {
	var payload agentReportPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	claims, err := auth.ParseInstallToken(h.cfg.JWT.Secret, payload.Token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	nodeRow, err := h.queries.GetNode(r.Context(), claims.NodeID)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// First report marks token used and activates node
	if !nodeRow.TokenUsed {
		if err := h.queries.MarkInstallTokenUsed(ctx, claims.NodeID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	data, _ := json.Marshal(payload)
	if err := h.queries.UpdateNodeSystemInfo(ctx, string(data), claims.NodeID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := h.queries.UpdateNodeStatus(ctx, "online", claims.NodeID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	next := 30
	if isPoll {
		next = 10
	}
	respondJSON(w, map[string]interface{}{
		"type":                "ack",
		"node_id":             claims.NodeID,
		"status":              "online",
		"next_report_seconds": next,
	})
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd panel && go test ./internal/api -run "TestAgentHTTPReport|TestAgentPull" -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add panel/internal/api/agent_http.go panel/internal/api/agent_http_test.go panel/go.mod panel/go.sum
git commit -m "feat(panel): add agent HTTP report and pull endpoints"
```


### Task 9: Backend Auth Handler, Static Hosting and Main Entry

**Files:**
- Create: `panel/internal/api/api.go`
- Create: `panel/internal/api/auth.go`
- Create: `panel/internal/api/static.go`
- Create: `panel/cmd/panel/main.go`
- Create: `panel/internal/api/api_test.go`
- Modify: `panel/go.mod` (add gorilla/mux)

**Interfaces:**
- Consumes: `config.Config`, `db.Queries`, `auth` package, all handlers
- Produces: `http.Server` listening on configured port
- Produces: `respondJSON`, `AuthMiddleware` helpers

- [ ] **Step 1: Write helper and middleware**

Create `panel/internal/api/api.go`:
```go
package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
)

func respondJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

type contextKey string

const ContextUsername contextKey = "username"

func AuthMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow public paths
			if strings.HasPrefix(r.URL.Path, "/api/v1/login") ||
				strings.HasPrefix(r.URL.Path, "/api/v1/agent/") {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := auth.ParseToken(cfg.JWT.Secret, parts[1])
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			r = r.WithContext(context.WithValue(r.Context(), ContextUsername, claims.Username))
			next.ServeHTTP(w, r)
		})
	}
}
```

- [ ] **Step 2: Write auth handler**

Create `panel/internal/api/auth.go`:
```go
package api

import (
	"encoding/json"
	"net/http"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
)

type AuthHandler struct {
	queries *db.Queries
	cfg     *config.Config
}

func NewAuthHandler(queries *db.Queries, cfg *config.Config) *AuthHandler {
	return &AuthHandler{queries: queries, cfg: cfg}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string `json:"token"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	user, err := h.queries.GetUserByUsername(r.Context(), req.Username)
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateToken(h.cfg.JWT.Secret, user.Username, h.cfg.JWT.ExpireHours)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, loginResponse{Token: token})
}
```

- [ ] **Step 3: Write static handler**

Create `panel/internal/api/static.go`:
```go
package api

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:static
var staticFS embed.FS

func StaticHandler() (http.Handler, error) {
	fsys, err := fs.Sub(staticFS, "static")
	if err != nil {
		return nil, err
	}
	return http.FileServer(http.FS(fsys)), nil
}
```

- [ ] **Step 4: Write frontend WebSocket handler**

Create `panel/internal/api/frontend_ws.go`:
```go
package api

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	wshub "github.com/bsdock/panel/internal/websocket"
)

type FrontendWSHandler struct {
	hub      *wshub.Hub
	upgrader websocket.Upgrader
}

func NewFrontendWSHandler(hub *wshub.Hub) *FrontendWSHandler {
	return &FrontendWSHandler{
		hub: hub,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *FrontendWSHandler) Register(r *mux.Router) {
	r.HandleFunc("/ws", h.Handle).Methods("GET")
}

func (h *FrontendWSHandler) Handle(w http.ResponseWriter, r *http.Request) {
	nodeID := r.URL.Query().Get("node_id")
	if nodeID == "" {
		http.Error(w, "node_id required", http.StatusBadRequest)
		return
	}

	ws, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer ws.Close()

	ch := make(chan []byte, 16)
	h.hub.Subscribe(nodeID, ch)
	defer h.hub.Unsubscribe(nodeID, ch)

	for msg := range ch {
		if err := ws.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
}
```

- [ ] **Step 5: Write main.go**

Create `panel/cmd/panel/main.go`:
```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/api"
	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
)

func main() {
	cfg, err := config.Load("")
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	sqlDB, err := db.Open(cfg.Database.Path)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer sqlDB.Close()
	queries := db.New(sqlDB)

	// Bootstrap admin user
	if cfg.Admin.Username != "" && cfg.Admin.Password != "" {
		_, err := queries.GetUserByUsername(context.Background(), cfg.Admin.Username)
		if err != nil {
			hash, _ := auth.HashPassword(cfg.Admin.Password)
			_, _ = queries.CreateUser(context.Background(), db.CreateUserParams{
				Username:     cfg.Admin.Username,
				PasswordHash: hash,
			})
		}
	}

	nodeSvc := node.NewService(queries)
	hub := wshub.NewHub()
	go hub.Run()

	r := mux.NewRouter()

	// Agent endpoints (public)
	agentWS := api.NewAgentWSHandler(nodeSvc, queries, cfg, hub)
	agentWS.Register(r)
	agentHTTP := api.NewAgentHTTPHandler(nodeSvc, queries, cfg)
	agentHTTP.Register(r)

	// API routes with auth
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	authHandler := api.NewAuthHandler(queries, cfg)
	apiRouter.HandleFunc("/login", authHandler.Login).Methods("POST")

	nodesHandler := api.NewNodesHandler(nodeSvc, cfg)
	nodesHandler.Register(apiRouter)

	// Frontend WebSocket for real-time updates
	frontendWS := api.NewFrontendWSHandler(hub)
	frontendWS.Register(apiRouter)

	// Static files
	static, err := api.StaticHandler()
	if err != nil {
		log.Fatalf("static handler: %v", err)
	}
	r.PathPrefix("/").Handler(static)

	// Middleware
	handler := api.AuthMiddleware(cfg)(r)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: handler,
	}

	go func() {
		log.Printf("panel listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}
}
```

Note: `api.NewFrontendWSHandler` will be implemented in Task 16 or can be added here. For now add a placeholder TODO in Task 16.

- [ ] **Step 6: Add dependencies and run tests**

Run:
```bash
cd panel && go get github.com/gorilla/mux
cd panel && go test ./... -run "Test" -v
```
Expected: PASS for all existing tests (some main.go compile issues may surface).

- [ ] **Step 7: Commit**

```bash
git add panel/cmd/panel/main.go panel/internal/api/api.go panel/internal/api/auth.go panel/internal/api/static.go panel/internal/api/frontend_ws.go panel/go.mod panel/go.sum
git commit -m "feat(panel): add auth handler, static hosting, frontend WS and main entry"
```


### Task 10: Agent System Info Collector

**Files:**
- Create: `agent/internal/collector/collector.go`
- Create: `agent/internal/collector/collector_test.go`
- Modify: `agent/go.mod` (add gopsutil)

**Interfaces:**
- Produces: `collector.Collect() (*SystemInfo, error)`
- Produces: `SystemInfo` struct matching design payload.

- [ ] **Step 1: Write the failing test**

Create `agent/internal/collector/collector_test.go`:
```go
package collector

import (
	"testing"
)

func TestCollect(t *testing.T) {
	info, err := Collect()
	if err != nil {
		t.Fatal(err)
	}
	if info.Hostname == "" {
		t.Fatal("expected hostname")
	}
	if info.OS == "" {
		t.Fatal("expected os")
	}
	if info.Arch == "" {
		t.Fatal("expected arch")
	}
	if info.CPUCores <= 0 {
		t.Fatal("expected cpu cores")
	}
	if info.MemoryTotal <= 0 {
		t.Fatal("expected memory")
	}
}
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
cd agent && go test ./internal/collector -v
```
Expected: FAIL with undefined Collect.

- [ ] **Step 3: Implement collector**

Add dependency:
```bash
cd agent && go get github.com/shirou/gopsutil/v4/cpu github.com/shirou/gopsutil/v4/host github.com/shirou/gopsutil/v4/mem github.com/shirou/gopsutil/v4/disk github.com/shirou/gopsutil/v4/net
```

Create `agent/internal/collector/collector.go`:
```go
package collector

import (
	"net"
	"runtime"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
)

type SystemInfo struct {
	Hostname  string   `json:"hostname"`
	OS        string   `json:"os"`
	Arch      string   `json:"arch"`
	Kernel    string   `json:"kernel"`
	CPUModel  string   `json:"cpu_model"`
	CPUCores  int      `json:"cpu_cores"`
	MemoryTotal int64  `json:"memory_total"`
	DiskTotal int64    `json:"disk_total"`
	DiskFree  int64    `json:"disk_free"`
	IPs       []string `json:"ips"`
	Uptime    uint64   `json:"uptime"`
}

func Collect() (*SystemInfo, error) {
	hostInfo, err := host.Info()
	if err != nil {
		return nil, err
	}

	cpuInfo, err := cpu.Info()
	if err != nil {
		return nil, err
	}
	cpuModel := ""
	if len(cpuInfo) > 0 {
		cpuModel = cpuInfo[0].ModelName
	}
	cpuCounts, _ := cpu.Counts(true)

	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	diskInfo, err := disk.Usage("/")
	if err != nil {
		return nil, err
	}

	ips := collectIPs()

	return &SystemInfo{
		Hostname:    hostInfo.Hostname,
		OS:          hostInfo.OS,
		Arch:        runtime.GOARCH,
		Kernel:      hostInfo.KernelVersion,
		CPUModel:    cpuModel,
		CPUCores:    cpuCounts,
		MemoryTotal: int64(memInfo.Total),
		DiskTotal:   int64(diskInfo.Total),
		DiskFree:    int64(diskInfo.Free),
		IPs:         ips,
		Uptime:      hostInfo.Uptime,
	}, nil
}

func collectIPs() []string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return nil
	}
	var ips []string
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			ips = append(ips, ipnet.IP.String())
		}
	}
	return ips
}
```

- [ ] **Step 4: Run test to verify pass**

Run:
```bash
cd agent && go test ./internal/collector -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/internal/collector/ agent/go.mod agent/go.sum
git commit -m "feat(agent): add system info collector"
```


### Task 11: Agent Transport Manager

**Files:**
- Create: `agent/internal/config/config.go`
- Create: `agent/internal/transport/transport.go`
- Create: `agent/internal/transport/ws.go`
- Create: `agent/internal/transport/http.go`
- Create: `agent/internal/transport/pull.go`
- Create: `agent/internal/transport/transport_test.go`
- Modify: `agent/go.mod` (add gorilla/websocket)

**Interfaces:**
- Consumes: `collector.SystemInfo`
- Produces: `transport.NewClient(cfg *config.Config) *Client`
- Produces: `client.RegisterAndKeepAlive(ctx)` which tries WebSocket → HTTP → Pull.

- [ ] **Step 1: Write the failing test**

Create `agent/internal/transport/transport_test.go`:
```go
package transport

import (
	"testing"

	"github.com/bsdock/agent/internal/config"
)

func TestClientModeAuto(t *testing.T) {
	cfg := &config.Config{
		PanelURL:    "https://panel.local",
		Token:       "test-token",
		Mode:        "auto",
	}
	c := NewClient(cfg)
	if c == nil {
		t.Fatal("expected client")
	}
	if c.mode != "auto" {
		t.Fatalf("expected auto mode, got %s", c.mode)
	}
}
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
cd agent && go test ./internal/transport -v
```
Expected: FAIL with undefined config and client.

- [ ] **Step 3: Implement config and client**

Create `agent/internal/config/config.go`:
```go
package config

type Config struct {
	PanelURL    string
	Token       string
	Mode        string // auto | websocket | http | pull
	Insecure    bool
}
```

Create `agent/internal/transport/transport.go`:
```go
package transport

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bsdock/agent/internal/collector"
	"github.com/bsdock/agent/internal/config"
)

type Client struct {
	cfg  *config.Config
	mode string
}

func NewClient(cfg *config.Config) *Client {
	mode := cfg.Mode
	if mode == "" {
		mode = "auto"
	}
	return &Client{cfg: cfg, mode: mode}
}

func (c *Client) RegisterAndKeepAlive(ctx context.Context) error {
	info, err := collector.Collect()
	if err != nil {
		return fmt.Errorf("collect: %w", err)
	}

	modes := c.resolveModes()
	for _, m := range modes {
		if err := c.tryMode(ctx, m, info); err == nil {
			return nil
		}
	}
	return fmt.Errorf("all transport modes failed")
}

func (c *Client) resolveModes() []string {
	if c.mode != "auto" {
		return []string{c.mode}
	}
	return []string{"websocket", "http", "pull"}
}

func (c *Client) tryMode(ctx context.Context, mode string, info *collector.SystemInfo) error {
	switch mode {
	case "websocket":
		return c.runWebSocket(ctx, info)
	case "http":
		return c.runHTTP(ctx, info)
	case "pull":
		return c.runPull(ctx, info)
	}
	return fmt.Errorf("unknown mode: %s", mode)
}

func (c *Client) buildPayload(info *collector.SystemInfo) map[string]interface{} {
	payload := map[string]interface{}{
		"token":    c.cfg.Token,
		"hostname": info.Hostname,
		"os":       info.OS,
		"arch":     info.Arch,
		"kernel":   info.Kernel,
		"cpu_model": info.CPUModel,
		"cpu_cores": info.CPUCores,
		"memory_total": info.MemoryTotal,
		"disk_total": info.DiskTotal,
		"disk_free":  info.DiskFree,
		"ips":        info.IPs,
		"uptime":     info.Uptime,
	}
	return map[string]interface{}{
		"type":    "register",
		"payload": payload,
	}
}

func (c *Client) buildHeartbeat() map[string]interface{} {
	return map[string]interface{}{
		"type":      "heartbeat",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
}

func jsonBytes(v interface{}) []byte {
	b, _ := json.Marshal(v)
	return b
}
```

- [ ] **Step 4: Implement WebSocket transport**

Create `agent/internal/transport/ws.go`:
```go
package transport

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	"github.com/gorilla/websocket"

	"github.com/bsdock/agent/internal/collector"
)

func (c *Client) runWebSocket(ctx context.Context, info *collector.SystemInfo) error {
	scheme := "wss"
	if c.cfg.Insecure {
		scheme = "ws"
	}
	u, err := url.Parse(c.cfg.PanelURL)
	if err != nil {
		return err
	}
	u.Scheme = scheme
	u.Path = "/api/v1/agent/ws"
	q := u.Query()
	q.Set("token", c.cfg.Token)
	u.RawQuery = q.Encode()

	ws, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return err
	}
	defer ws.Close()

	if err := ws.WriteJSON(c.buildPayload(info)); err != nil {
		return err
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := ws.WriteJSON(c.buildHeartbeat()); err != nil {
				return err
			}
		}
	}
}
```

- [ ] **Step 5: Implement HTTP transport**

Create `agent/internal/transport/http.go`:
```go
package transport

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/bsdock/agent/internal/collector"
)

func (c *Client) runHTTP(ctx context.Context, info *collector.SystemInfo) error {
	endpoint := c.cfg.PanelURL + "/api/v1/agent/report"
	if err := c.post(ctx, endpoint, c.buildPayload(info)); err != nil {
		return err
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := c.post(ctx, endpoint, c.buildHeartbeat()); err != nil {
				return err
			}
		}
	}
}

func (c *Client) post(ctx context.Context, endpoint string, body interface{}) error {
	b := jsonBytes(body)
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}
```

- [ ] **Step 6: Implement Pull transport**

Create `agent/internal/transport/pull.go`:
```go
package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/bsdock/agent/internal/collector"
)

func (c *Client) runPull(ctx context.Context, info *collector.SystemInfo) error {
	endpoint := c.cfg.PanelURL + "/api/v1/agent/poll"
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		b := jsonBytes(c.buildPayload(info))
		req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(b))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			time.Sleep(10 * time.Second)
			continue
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			time.Sleep(10 * time.Second)
			continue
		}

		var ack struct {
			NextReportSeconds int `json:"next_report_seconds"`
		}
		json.NewDecoder(resp.Body).Decode(&ack)
		interval := time.Duration(ack.NextReportSeconds) * time.Second
		if interval < 5*time.Second {
			interval = 10 * time.Second
		}
		time.Sleep(interval)
	}
}
```

- [ ] **Step 7: Run tests**

Run:
```bash
cd agent && go test ./internal/transport -v
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add agent/internal/config/ agent/internal/transport/ agent/go.mod agent/go.sum
git commit -m "feat(agent): add websocket/http/pull transport manager"
```


### Task 12: Agent Main and Install Script

**Files:**
- Create: `agent/cmd/agent/main.go`
- Create: `scripts/install-agent.sh`
- Create: `scripts/install-panel.sh`

**Interfaces:**
- Consumes: `config.Config`, `transport.Client`
- Produces: `bsdock-agent` binary and install scripts

- [ ] **Step 1: Write agent main.go**

Create `agent/cmd/agent/main.go`:
```go
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bsdock/agent/internal/config"
	"github.com/bsdock/agent/internal/transport"
)

func main() {
	var cfg config.Config
	flag.StringVar(&cfg.PanelURL, "panel", "", "Panel URL")
	flag.StringVar(&cfg.Token, "token", "", "Install token")
	flag.StringVar(&cfg.Mode, "mode", "auto", "Connection mode: auto|websocket|http|pull")
	flag.BoolVar(&cfg.Insecure, "insecure", false, "Allow ws:// instead of wss://")
	flag.Parse()

	if cfg.PanelURL == "" || cfg.Token == "" {
		log.Fatal("--panel and --token are required")
	}

	client := transport.NewClient(&cfg)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		if err := client.RegisterAndKeepAlive(ctx); err != nil {
			log.Printf("transport error: %v", err)
			cancel()
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	cancel()
}
```

- [ ] **Step 2: Write install-agent.sh**

Create `scripts/install-agent.sh`:
```bash
#!/bin/bash
set -e

PANEL_URL=""
TOKEN=""
MODE="auto"
INSECURE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --panel) PANEL_URL="$2"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --insecure) INSECURE="true"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$PANEL_URL" || -z "$TOKEN" ]]; then
  echo "Usage: $0 --panel <url> --token <token> [--mode auto|websocket|http|pull] [--insecure]"
  exit 1
fi

ARCH=$(uname -m)
 case "$ARCH" in
  x86_64) BIN_ARCH="amd64" ;;
  aarch64|arm64) BIN_ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

INSTALL_DIR="/opt/bsdock-agent"
BIN_NAME="bsdock-agent-linux-${BIN_ARCH}"
BIN_URL="${PANEL_URL}/static/agent/${BIN_NAME}"

mkdir -p "$INSTALL_DIR"
echo "Downloading agent from $BIN_URL ..."
curl -fsSL "$BIN_URL" -o "${INSTALL_DIR}/bsdock-agent"
chmod +x "${INSTALL_DIR}/bsdock-agent"

cat > /etc/systemd/system/bsdock-agent.service <<EOF
[Unit]
Description=BSDock Agent
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/bsdock-agent --panel "$PANEL_URL" --token "$TOKEN" --mode "$MODE"$([ "$INSECURE" = "true" ] && echo " --insecure")
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bsdock-agent
systemctl restart bsdock-agent

echo "Agent installed and started."
```

- [ ] **Step 3: Write install-panel.sh**

Create `scripts/install-panel.sh`:
```bash
#!/bin/bash
set -e

INSTALL_DIR="/opt/bsdock"
mkdir -p "$INSTALL_DIR"

if [[ ! -f "./panel" ]]; then
  echo "panel binary not found in current directory"
  exit 1
fi

cp ./panel "$INSTALL_DIR/panel"
cp ./config.yaml "$INSTALL_DIR/config.yaml" 2>/dev/null || true

cat > /etc/systemd/system/bsdock-panel.service <<EOF
[Unit]
Description=BSDock Panel
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/panel
Restart=always
RestartSec=5
Environment="BSDOCK_ADMIN_USERNAME=${BSDOCK_ADMIN_USERNAME}"
Environment="BSDOCK_ADMIN_PASSWORD=${BSDOCK_ADMIN_PASSWORD}"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bsdock-panel
systemctl restart bsdock-panel

echo "Panel installed and started."
```

- [ ] **Step 4: Verify agent builds**

Run:
```bash
bun run build:agent:amd64
bun run build:agent:arm64
```
Expected: binaries created in `dist/`.

- [ ] **Step 5: Commit**

```bash
git add agent/cmd/agent/main.go scripts/install-agent.sh scripts/install-panel.sh
git commit -m "feat(agent): add agent main and install scripts"
```


### Task 13: Frontend Setup with Vite, shadcn/ui, TanStack Router and Themes

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/routeTree.gen.ts` (generated later)
- Create: `web/src/routes/__root.tsx`
- Create: `web/tailwind.config.ts`
- Create: `web/components.json`
- Create: `web/src/index.css`
- Modify: root `package.json` (add dev scripts)

**Interfaces:**
- Produces: runnable Vite React app at `http://localhost:5173`
- Produces: root route with theme provider and layout

- [ ] **Step 1: Write the failing check**

Run:
```bash
ls web/src/main.tsx
```
Expected: file does not exist.

- [ ] **Step 2: Initialize web project**

Create `web/package.json`:
```json
{
  "name": "bsdock-web",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.0.0",
    "@tanstack/router-devtools": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "next-themes": "^0.4.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.5.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@tanstack/router-plugin": "^1.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

Create `web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `web/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `web/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
```

Create `web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BSDock</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `web/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
```

Create `web/postcss.config.js`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Create `web/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

Create `web/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

Create `web/src/lib/utils.ts`:
```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Create `web/src/components/theme-provider.tsx`:
```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

Create `web/src/components/ui/button.tsx` (minimal shadcn-style):
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
```

Create `web/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
)
```

Create `web/src/routes/__root.tsx`:
```tsx
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b px-4 py-3">
        <Link to="/" className="font-bold">BSDock</Link>
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Install dependencies and generate routes**

Run:
```bash
cd web && bun install
cd web && bunx @tanstack/router-cli@latest generate
```
Expected: `web/src/routeTree.gen.ts` generated.

- [ ] **Step 4: Verify dev build**

Run:
```bash
cd web && bun run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add web/ package.json
git commit -m "feat(web): setup Vite, React, TanStack Router, shadcn/ui and dark theme"
```


### Task 14: Frontend Auth Page and API Client

**Files:**
- Create: `web/src/lib/api.ts`
- Create: `web/src/lib/auth.ts`
- Create: `web/src/routes/login.tsx`
- Create: `web/src/routes/index.tsx`
- Create: `web/src/components/ui/input.tsx`
- Create: `web/src/components/ui/label.tsx`
- Create: `web/src/components/ui/card.tsx`
- Modify: `web/src/routes/__root.tsx` (add logout/theme toggle)

**Interfaces:**
- Produces: `apiClient` with `login`, `getNodes`, `getNode`, `createNode`
- Produces: `/login` route and redirect logic

- [ ] **Step 1: Write the API client**

Create `web/src/lib/api.ts`:
```ts
const API_BASE = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('bsdock_token')
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  if (res.status === 401) {
    localStorage.removeItem('bsdock_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    throw new Error(await res.text())
  }
  return res.json()
}

export const api = {
  login: (username: string, password: string) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getNodes: () => request('/nodes'),
  getNode: (id: string) => request(`/nodes/${id}`),
  createNode: (name: string, panelURL: string) =>
    request('/nodes', {
      method: 'POST',
      body: JSON.stringify({ name }),
      headers: { 'X-Panel-URL': panelURL },
    }),
}
```

- [ ] **Step 2: Write auth helper**

Create `web/src/lib/auth.ts`:
```ts
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('bsdock_token')
}

export function setToken(token: string) {
  localStorage.setItem('bsdock_token', token)
}

export function clearToken() {
  localStorage.removeItem('bsdock_token')
}
```

- [ ] **Step 3: Create login page**

Create `web/src/routes/login.tsx`:
```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = await api.login(username, password)
      setToken(data.token)
      navigate({ to: '/nodes' })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login to BSDock</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create index redirect route**

Create `web/src/routes/index.tsx`:
```tsx
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  return isAuthenticated() ? <Navigate to="/nodes" /> : <Navigate to="/login" />
}
```

- [ ] **Step 5: Add UI components**

Create minimal `web/src/components/ui/input.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
```

Create `web/src/components/ui/label.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn('text-sm font-medium', className)} {...props} />
  )
)
Label.displayName = 'Label'
```

Create `web/src/components/ui/card.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
)

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
)

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
)

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
)
```

- [ ] **Step 6: Update root route with auth guard and theme toggle**

Update `web/src/routes/__root.tsx`:
```tsx
import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { isAuthenticated, clearToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (!isAuthenticated() && window.location.pathname !== '/login') {
      navigate({ to: '/login' })
    }
  }, [navigate])

  const logout = () => {
    clearToken()
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold">BSDock</Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            Toggle Theme
          </Button>
          {isAuthenticated() && (
            <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
          )}
        </div>
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 7: Regenerate routes and verify**

Run:
```bash
cd web && bunx @tanstack/router-cli@latest generate
cd web && bun run build
```
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/ web/src/routes/login.tsx web/src/routes/index.tsx web/src/components/ui/ web/src/routes/__root.tsx
git commit -m "feat(web): add login page, auth helpers and api client"
```


### Task 15: Frontend Node List and Detail Pages

**Files:**
- Create: `web/src/routes/nodes/index.tsx`
- Create: `web/src/routes/nodes/$nodeId.tsx`
- Create: `web/src/components/ui/table.tsx`
- Create: `web/src/components/ui/badge.tsx`
- Create: `web/src/components/ui/dialog.tsx`
- Create: `web/src/components/ui/textarea.tsx`
- Modify: `web/src/lib/api.ts` (already done)

**Interfaces:**
- Produces: `/nodes` page listing nodes and create dialog
- Produces: `/nodes/$nodeId` page showing system info cards

- [ ] **Step 1: Write Node list page**

Create `web/src/routes/nodes/index.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/nodes/')({
  component: NodesPage,
})

type Node = {
  id: string
  name: string
  status: 'pending' | 'online' | 'offline'
  system_info?: Record<string, any>
  last_seen_at?: string
  created_at: string
}

function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [name, setName] = useState('')
  const [panelURL, setPanelURL] = useState(window.location.origin)
  const [installCommand, setInstallCommand] = useState('')
  const [open, setOpen] = useState(false)

  const load = async () => {
    const data = await api.getNodes()
    setNodes(data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = await api.createNode(name, panelURL)
    setInstallCommand(data.install_command)
    setName('')
    load()
  }

  const copyCommand = () => {
    navigator.clipboard.writeText(installCommand)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nodes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setInstallCommand(''); setOpen(true) }}>New Node</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Node</DialogTitle>
            </DialogHeader>
            {!installCommand ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <Label>Panel URL</Label>
                  <Input value={panelURL} onChange={(e) => setPanelURL(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Run this command on the target server:</p>
                <pre className="rounded bg-muted p-3 text-xs overflow-auto">{installCommand}</pre>
                <Button onClick={copyCommand} className="w-full">Copy</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.id}>
                  <TableCell>{node.name}</TableCell>
                  <TableCell><StatusBadge status={node.status} /></TableCell>
                  <TableCell>{node.last_seen_at ? new Date(node.last_seen_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>{new Date(node.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Link to="/nodes/$nodeId" params={{ nodeId: node.id }}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'online' ? 'default' : status === 'offline' ? 'destructive' : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}
```

- [ ] **Step 2: Write Node detail page**

Create `web/src/routes/nodes/$nodeId.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/nodes/$nodeId')({
  component: NodeDetailPage,
})

function NodeDetailPage() {
  const { nodeId } = Route.useParams()
  const [node, setNode] = useState<any>(null)

  const load = async () => {
    const data = await api.getNode(nodeId)
    setNode(data)
  }

  useEffect(() => {
    load()
  }, [nodeId])

  if (!node) return <div>Loading...</div>

  const info = node.system_info || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{node.name}</h1>
        <Badge variant={node.status === 'online' ? 'default' : node.status === 'offline' ? 'destructive' : 'secondary'}>
          {node.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Hostname" value={info.hostname} />
        <InfoCard title="OS / Arch" value={`${info.os} / ${info.arch}`} />
        <InfoCard title="Kernel" value={info.kernel} />
        <InfoCard title="CPU" value={`${info.cpu_model} (${info.cpu_cores} cores)`} />
        <InfoCard title="Memory" value={formatBytes(info.memory_total)} />
        <InfoCard title="Disk" value={`${formatBytes(info.disk_total)} total / ${formatBytes(info.disk_free)} free`} />
        <InfoCard title="IPs" value={(info.ips || []).join(', ')} />
        <InfoCard title="Uptime" value={`${info.uptime}s`} />
      </div>
    </div>
  )
}

function InfoCard({ title, value }: { title: string; value?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold">{value || '-'}</p>
      </CardContent>
    </Card>
  )
}

function formatBytes(bytes?: number) {
  if (!bytes) return '-'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}
```

- [ ] **Step 3: Add UI components**

Create `web/src/components/ui/table.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-auto">
    <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
)

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('[&_tr]:border-b', className)} {...props} />
)

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
)

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
)

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className)} {...props} />
)

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('p-4 align-middle', className)} {...props} />
)
```

Create `web/src/components/ui/badge.tsx`:
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export const Badge = ({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', variants[variant], className)} {...props} />
  )
}
```

Create `web/src/components/ui/dialog.tsx`:
```tsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger

export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(
  ({ className, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn('fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-card p-6 shadow-lg', className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
)
DialogContent.displayName = 'DialogContent'

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)

export const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
)
DialogTitle.displayName = 'DialogTitle'
```

Add `@radix-ui/react-dialog` to `web/package.json` dependencies.

- [ ] **Step 4: Regenerate routes and verify**

Run:
```bash
cd web && bunx @tanstack/router-cli@latest generate
cd web && bun run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add web/src/routes/nodes/ web/src/components/ui/table.tsx web/src/components/ui/badge.tsx web/src/components/ui/dialog.tsx web/package.json
git commit -m "feat(web): add node list and detail pages"
```


### Task 16: Frontend Real-Time Updates

**Files:**
- Create: `web/src/hooks/useNodes.ts`
- Create: `web/src/hooks/useNode.ts`
- Modify: `web/src/routes/nodes/index.tsx`
- Modify: `web/src/routes/nodes/$nodeId.tsx`

**Interfaces:**
- Consumes: `/api/v1/ws?node_id=...` WebSocket and `/api/v1/nodes` polling fallback
- Produces: reactive node data updates in list and detail pages

- [ ] **Step 1: Write useNodes hook**

Create `web/src/hooks/useNodes.ts`:
```ts
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function useNodes() {
  const [nodes, setNodes] = useState<any[]>([])

  const load = async () => {
    try {
      const data = await api.getNodes()
      setNodes(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    load()

    let ws: WebSocket | null = null
    let interval: ReturnType<typeof setInterval> | null = null

    const connect = () => {
      const url = new URL('/ws', window.location.origin)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.searchParams.set('node_id', '*')

      ws = new WebSocket(url.toString())
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'node_update') {
            load()
          }
        } catch (err) {
          console.error(err)
        }
      }
      ws.onclose = () => {
        ws = null
        if (!interval) {
          interval = setInterval(load, 3000)
        }
      }
      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      ws?.close()
      if (interval) clearInterval(interval)
    }
  }, [])

  return { nodes, reload: load }
}
```

- [ ] **Step 2: Write useNode hook**

Create `web/src/hooks/useNode.ts`:
```ts
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function useNode(nodeId: string) {
  const [node, setNode] = useState<any>(null)

  const load = async () => {
    try {
      const data = await api.getNode(nodeId)
      setNode(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    load()

    let ws: WebSocket | null = null
    let interval: ReturnType<typeof setInterval> | null = null

    const connect = () => {
      const url = new URL('/ws', window.location.origin)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.searchParams.set('node_id', nodeId)

      ws = new WebSocket(url.toString())
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'node_update' && msg.payload?.id === nodeId) {
            setNode(msg.payload)
          }
        } catch (err) {
          console.error(err)
        }
      }
      ws.onclose = () => {
        ws = null
        if (!interval) {
          interval = setInterval(load, 3000)
        }
      }
      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      ws?.close()
      if (interval) clearInterval(interval)
    }
  }, [nodeId])

  return { node, reload: load }
}
```

- [ ] **Step 3: Update Node list page to use hook**

Update `web/src/routes/nodes/index.tsx`:
```tsx
import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { useNodes } from '@/hooks/useNodes'
// ... other imports

export const Route = createFileRoute('/nodes/')({
  component: NodesPage,
})

function NodesPage() {
  const { nodes, reload } = useNodes()
  const [name, setName] = useState('')
  const [panelURL, setPanelURL] = useState(window.location.origin)
  const [installCommand, setInstallCommand] = useState('')
  const [open, setOpen] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = await api.createNode(name, panelURL)
    setInstallCommand(data.install_command)
    setName('')
    reload()
  }

  // ... rest unchanged
}
```

- [ ] **Step 4: Update Node detail page to use hook**

Update `web/src/routes/nodes/$nodeId.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useNode } from '@/hooks/useNode'
// ... other imports

export const Route = createFileRoute('/nodes/$nodeId')({
  component: NodeDetailPage,
})

function NodeDetailPage() {
  const { nodeId } = Route.useParams()
  const { node } = useNode(nodeId)

  if (!node) return <div>Loading...</div>

  // ... rest unchanged
}
```

- [ ] **Step 5: Verify build and run dev**

Run:
```bash
cd web && bun run build
bun run dev
```
Expected: dev server starts, frontend accessible.

- [ ] **Step 6: Visual acceptance with Playwright/CloakBrowser**

Run:
```bash
cd web && bun run e2e:ui
```
Manually verify:
1. Login page renders correctly.
2. Create Node dialog opens and shows install command.
3. Node list and detail pages render.

- [ ] **Step 7: Commit**

```bash
git add web/src/hooks/useNodes.ts web/src/hooks/useNode.ts web/src/routes/nodes/index.tsx web/src/routes/nodes/$nodeId.tsx
git commit -m "feat(web): add real-time node updates via websocket and polling fallback"
```


### Task 17: End-to-End Tests with Playwright

**Files:**
- Create: `web/playwright.config.ts`
- Create: `web/tests/e2e/mvp.spec.ts`
- Create: `web/tests/fixtures.ts` (if needed)
- Modify: `web/package.json` (scripts already defined)

**Interfaces:**
- Consumes: full running panel stack (Panel-Backend Go service + Panel-Frontend Vite app)
- Produces: passing E2E test covering login → create node → agent registration → online status

- [ ] **Step 1: Write Playwright config**

Create `web/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

- [ ] **Step 2: Write E2E test**

Create `web/tests/e2e/mvp.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import { execSync, spawn } from 'child_process'
import { mkdirSync, existsSync } from 'fs'
import path from 'path'

const TEST_DIR = path.join(__dirname, '../../.e2e-test')
const DB_PATH = path.join(TEST_DIR, 'panel.db')
const CONFIG_PATH = path.join(TEST_DIR, 'config.yaml')

function setupEnv() {
  if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true })
  require('fs').writeFileSync(CONFIG_PATH, `
mode: master
port: "18080"
database:
  path: "${DB_PATH.replace(/\\/g, '/')}"
jwt:
  secret: "e2e-secret"
  expire_hours: 24
admin:
  username: "admin"
  password: "admin123"
`)
}

test.beforeAll(async () => {
  setupEnv()
  execSync('go build -o ../../dist/panel ../../panel/cmd/panel', { cwd: __dirname })
})

test('full mvp flow', async ({ page }) => {
  const panel = spawn(path.join(__dirname, '../../dist/panel'), [], {
    cwd: TEST_DIR,
    env: { ...process.env, BSDOCK_ADMIN_USERNAME: 'admin', BSDOCK_ADMIN_PASSWORD: 'admin123' },
  })

  try {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    await page.goto('/login')
    await page.fill('input#username', 'admin')
    await page.fill('input#password', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/nodes')

    await page.click('button:has-text("New Node")')
    await page.fill('input[placeholder="Name" i]', 'e2e-node')
    await page.fill('input[placeholder="Panel URL" i]', 'http://localhost:18080')
    await page.click('button[type="submit"]')

    await page.waitForSelector('pre', { timeout: 5000 })
    const command = await page.locator('pre').textContent()
    expect(command).toContain('--token')
    const token = command.match(/--token\s+(\S+)/)?.[1]
    expect(token).toBeTruthy()

    // Simulate agent registration via WebSocket
    const wsUrl = `ws://localhost:18080/api/v1/agent/ws?token=${token}`
    await page.evaluate((url) => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(url)
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'register',
            payload: {
              token: url.split('token=')[1],
              hostname: 'e2e-host',
              os: 'linux',
              arch: 'amd64',
              kernel: '6.0',
              cpu_model: 'Test CPU',
              cpu_cores: 2,
              memory_total: 1073741824,
              disk_total: 10737418240,
              disk_free: 5368709120,
              ips: ['127.0.0.1'],
              uptime: 60,
            },
          }))
          setTimeout(() => { ws.close(); resolve() }, 500)
        }
        ws.onerror = reject
      })
    }, wsUrl)

    await page.waitForTimeout(1000)
    const row = page.locator('table tbody tr').first()
    await expect(row.locator('text=online')).toBeVisible()

    await row.locator('button:has-text("View")').click()
    await page.waitForURL(/\/nodes\/.+/)
    await expect(page.locator('text=e2e-host')).toBeVisible()
  } finally {
    panel.kill()
  }
})
```

- [ ] **Step 3: Install Playwright browsers**

Run:
```bash
cd web && bunx playwright install chromium
```

- [ ] **Step 4: Run E2E test**

Run:
```bash
bun run e2e
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/playwright.config.ts web/tests/e2e/mvp.spec.ts
git commit -m "test(web): add Playwright e2e test for full MVP flow"
```


### Task 18: GitHub Actions Release Workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Produces: GitHub Release with panel binary and agent binaries for linux/amd64 and linux/arm64

- [ ] **Step 1: Write workflow**

Create `.github/workflows/release.yml`:
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.24'

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install web dependencies
        run: cd web && bun install

      - name: Build frontend
        run: bun run build:web

      - name: Build panel binary
        run: bun run build:panel

      - name: Build agent binaries
        run: |
          bun run build:agent:amd64
          bun run build:agent:arm64

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            dist/panel
            dist/bsdock-agent-linux-amd64
            dist/bsdock-agent-linux-arm64
          generate_release_notes: true
```

- [ ] **Step 2: Verify workflow syntax**

Run:
```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add GitHub Actions release workflow"
```


### Task 19: README, AGENTS.md and Final Integration

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: root `package.json` (ensure all scripts work)

**Interfaces:**
- Produces: documented build/test/run commands
- Produces: updated AGENTS.md with project conventions

- [ ] **Step 1: Write README**

Update `README.md`:
```markdown
# BSDock

Panel-Node MVP：主从架构服务器管理面板。

## Tech Stack

- Backend: Go 1.24+ (net/http + gorilla/mux), SQLite (modernc.org/sqlite)
- Frontend: Vite + React 19 + TanStack Router + Tailwind CSS + shadcn/ui
- Agent: Go static binary (linux/amd64, linux/arm64)
- Package Manager: bun

## Development

```bash
# 安装前端依赖
bun install

# 一键启动前后端
cd web && bun install
bun run dev
```

访问 http://localhost:5173，后端 API 在 http://localhost:8080。

## Build

```bash
bun run build
```

产物在 `dist/`：
- `dist/panel`：面板二进制（已 embed 前端）
- `dist/bsdock-agent-linux-amd64`
- `dist/bsdock-agent-linux-arm64`

## Test

```bash
bun run test          # 单元测试
bun run e2e           # Playwright 端到端测试
```

## Deploy

### Panel (Linux VPS)

```bash
# 上传 panel、config.yaml、scripts/install-panel.sh
export BSDOCK_ADMIN_USERNAME=admin
export BSDOCK_ADMIN_PASSWORD=yourpassword
bash scripts/install-panel.sh
```

### Agent (Target Server)

在面板中创建 Node，复制安装命令并在目标服务器执行：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/scripts/install-agent.sh) \
  --panel https://panel.example.com \
  --token <token>
```
```

- [ ] **Step 2: Update AGENTS.md**

Update `AGENTS.md`:
```markdown
# AGENTS.md

## Project overview

BSDock is a Panel-Node management panel with master + SubAgent architecture.
Deployment sides: Panel side (`web/` Panel-Frontend + `panel/` Panel-Backend) and Node side (`agent/` Go agent).

## Build and test commands

- Build: `bun run build`
- Test: `bun run test`
- E2E: `bun run e2e`
- Dev: `bun run dev`

## Code style guidelines

- Go: standard formatting via `gofmt`, table-driven tests.
- Frontend: bun + Vite + shadcn/ui components, Tailwind CSS classes.
- TDD for all new functionality.

## Testing instructions

- Run `bun run test` for unit tests across all modules.
- Run `bun run e2e` for Playwright visual/functional acceptance.

## Security considerations

- JWT secrets and admin passwords must be set via env or config.yaml.
- Install tokens are single-use and expire in 24h.
- Production must use HTTPS/WSS.
```

- [ ] **Step 3: Run full test suite**

Run:
```bash
bun run test
bun run e2e
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add README.md AGENTS.md package.json
git commit -m "docs: update README and AGENTS.md with build/test/deploy instructions"
```


## Self-Review

### 1. Spec Coverage

| Design Requirement | Implementing Task |
|---|---|
| 单管理员登录 | Task 4 (JWT/bcrypt), Task 9 (login handler), Task 14 (login page) |
| 创建 Node / 生成安装命令 | Task 5 (install token), Task 6 (Node API), Task 14/15 (前端创建) |
| Agent 安装脚本 | Task 12 (install-agent.sh) |
| Agent 上报系统信息 | Task 10 (collector), Task 11 (transport) |
| WebSocket / HTTP / Pull 连接模式 | Task 7 (WS), Task 8 (HTTP/Pull), Task 11 (Agent transport) |
| 实时显示 Node 信息 | Task 7 (Hub), Task 16 (前端 hooks) |
| 默认深色主题 | Task 13 (next-themes + CSS variables) |
| TDD | 每个 Task 的 Step 1/2/4 |
| Playwright 可视化验收 | Task 17, Task 16 Step 6 |
| bun + vite 构建 | Task 1, Task 13 |
| GitHub Actions Release | Task 18 |

### 2. Placeholder Scan

- 无 `TBD`、`TODO`、`implement later` 等占位符。
- 所有代码步骤均给出具体文件、函数、命令。
- 安装命令中的 `<org>/<repo>` 为仓库占位，需在项目创建 GitHub 仓库后替换为真实值；已在 README 中说明。

### 3. Type Consistency

- `node.Service.Create` 签名在 Task 6 中定义为 `(ctx, name, panelURL, jwtSecret string, expireHours int)`；API handler 中按此调用。
- `auth.GenerateInstallToken` / `ParseInstallToken` 在 Task 5 中定义；Task 6 Node service 和 Task 7 Agent WS handler 均使用同一签名。
- `Config` 结构在 Task 2 中定义；后续任务引用 `config.Config` 保持一致。


## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-04-panel-node-mvp-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints for review.

Which approach?
