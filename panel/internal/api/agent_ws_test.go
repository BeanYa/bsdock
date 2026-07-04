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
