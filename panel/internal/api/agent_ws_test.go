package api

import (
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

func TestAgentWebSocketTokenAlreadyUsed(t *testing.T) {
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

	// Second connection with the same token must be rejected.
	ws2, resp, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err == nil {
		ws2.Close()
		t.Fatal("expected second connection to fail")
	}
	if resp.StatusCode != 401 {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
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
