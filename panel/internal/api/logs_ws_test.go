package api

import (
	"net/http"
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
	h.Handle(rec, req)
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
	entries, ok := msg["entries"].([]interface{})
	if !ok || len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %v", msg["entries"])
	}
}

func TestLogsWSSwitchSource(t *testing.T) {
	cfg := &config.Config{JWT: config.JWT{Secret: "secret"}}
	hub := panellog.NewHub()
	h := NewLogsWSHandler(cfg, hub)

	token, err := auth.GenerateToken(cfg.JWT.Secret, "admin", 1)
	if err != nil {
		t.Fatal(err)
	}

	hub.Write(panellog.SourceRequest, []byte("request line\n"))

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

	if err := conn.WriteJSON(map[string]string{"action": "subscribe", "source": "request"}); err != nil {
		t.Fatal(err)
	}

	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	if err := conn.ReadJSON(&msg); err != nil {
		t.Fatal(err)
	}
	if msg["type"] != "snapshot" {
		t.Fatalf("expected snapshot after switch, got %v", msg["type"])
	}
	entries, ok := msg["entries"].([]interface{})
	if !ok || len(entries) != 1 {
		t.Fatalf("expected 1 request entry, got %v", msg["entries"])
	}
}
