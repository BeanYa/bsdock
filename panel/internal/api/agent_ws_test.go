package api

import (
	"encoding/json"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	panelws "github.com/bsdock/panel/internal/websocket"
)

func TestAgentWebSocketRegister(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)
	hub := panelws.NewHub()
	go hub.Run()

	h := NewAgentWSHandler(svc, queries, cfg, hub)
	r := mux.NewRouter()
	h.Register(r)

	// Create a node to get a token
	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "linux", cfg.JWT.Secret, cfg.JWT.ExpireHours)
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

func TestAgentWebSocketInvalidTokenHash(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)
	hub := panelws.NewHub()
	go hub.Run()

	h := NewAgentWSHandler(svc, queries, cfg, hub)
	r := mux.NewRouter()
	h.Register(r)

	ctx := t.Context()
	created, originalToken, err := svc.Create(ctx, "srv-01", "linux", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}

	// Manually change the stored token hash so the original token no longer matches.
	if _, err := queries.RotateInstallToken(ctx, db.RotateInstallTokenParams{
		ID:        created.ID,
		TokenHash: "deadbeef",
	}); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(r)
	defer server.Close()

	u, _ := url.Parse(server.URL)
	u.Scheme = "ws"
	u.Path = "/api/v1/agent/ws"
	u.RawQuery = "token=" + originalToken

	ws, resp, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err == nil {
		ws.Close()
		t.Fatal("expected connection to fail")
	}
	if resp.StatusCode != 401 {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
}

func TestAgentWebSocketAllowsTokenReuseForInstalledNode(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)
	hub := panelws.NewHub()
	go hub.Run()

	h := NewAgentWSHandler(svc, queries, cfg, hub)
	r := mux.NewRouter()
	h.Register(r)

	ctx := t.Context()
	_, token, err := svc.Create(ctx, "srv-01", "linux", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(r)
	defer server.Close()

	u, _ := url.Parse(server.URL)
	u.Scheme = "ws"
	u.Path = "/api/v1/agent/ws"
	u.RawQuery = "token=" + token

	// First connection consumes the token.
	ws1, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		t.Fatal(err)
	}
	ws1.Close()

	time.Sleep(100 * time.Millisecond)

	// The installed agent must be able to reconnect with the same token after
	// a transient disconnect.
	ws2, resp, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		if resp != nil {
			t.Fatalf("expected second connection to succeed, got status %d: %v", resp.StatusCode, err)
		}
		t.Fatalf("expected second connection to succeed: %v", err)
	}
	ws2.Close()
}

func TestAgentWS_MetricsUpdatesSystemInfo(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)
	hub := panelws.NewHub()
	go hub.Run()

	h := NewAgentWSHandler(svc, queries, cfg, hub)
	r := mux.NewRouter()
	h.Register(r)

	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "linux", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}

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

	// Drain the initial connection broadcast.
	frontendCh := make(chan []byte, 2)
	hub.Subscribe(created.ID, frontendCh)
	select {
	case <-frontendCh:
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for initial node_update broadcast")
	}

	metrics := map[string]interface{}{
		"type":        "metrics",
		"cpu_percent": 12.5,
		"memory_used": int64(100),
		"memory_free": int64(200),
	}
	if err := ws.WriteJSON(metrics); err != nil {
		t.Fatal(err)
	}

	select {
	case msg := <-frontendCh:
		var broadcast map[string]interface{}
		if err := json.Unmarshal(msg, &broadcast); err != nil {
			t.Fatal(err)
		}
		if broadcast["type"] != "node_update" {
			t.Fatalf("expected node_update broadcast, got %v", broadcast["type"])
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for metrics node_update broadcast")
	}

	n, err := svc.Get(created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if n.SystemInfo == nil {
		t.Fatal("expected system_info after metrics")
	}
	var info map[string]interface{}
	if err := json.Unmarshal(n.SystemInfo, &info); err != nil {
		t.Fatal(err)
	}
	if info["cpu_percent"] != 12.5 {
		t.Fatalf("expected cpu_percent 12.5, got %v", info["cpu_percent"])
	}
	if info["memory_used"] != float64(100) {
		t.Fatalf("expected memory_used 100, got %v", info["memory_used"])
	}
	if info["memory_free"] != float64(200) {
		t.Fatalf("expected memory_free 200, got %v", info["memory_free"])
	}
}

func TestAgentWebSocketDisconnectDoesNotMarkOffline(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)
	hub := panelws.NewHub()
	go hub.Run()

	h := NewAgentWSHandler(svc, queries, cfg, hub)
	r := mux.NewRouter()
	h.Register(r)

	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "linux", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}

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

	// Wait briefly for the server to mark the node online.
	time.Sleep(100 * time.Millisecond)

	// Close the WebSocket connection.
	ws.Close()

	// Wait briefly to give any post-disconnect handlers time to run.
	time.Sleep(100 * time.Millisecond)

	node, err := svc.Get(created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if node.Status != "online" {
		t.Fatalf("expected node to remain online after disconnect, got %s", node.Status)
	}
}
