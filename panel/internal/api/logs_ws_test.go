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

func TestLogsWSConnectsToRequestedSource(t *testing.T) {
	cfg := &config.Config{JWT: config.JWT{Secret: "secret"}}
	hub := panellog.NewHub()
	h := NewLogsWSHandler(cfg, hub)

	token, err := auth.GenerateToken(cfg.JWT.Secret, "admin", 1)
	if err != nil {
		t.Fatal(err)
	}

	hub.Write(panellog.SourceRuntime, []byte("runtime line\n"))
	hub.Write(panellog.SourceRequest, []byte("request line\n"))

	server := httptest.NewServer(h)
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws/logs?source=request&token=" + token
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
	if msg["source"] != string(panellog.SourceRequest) {
		t.Fatalf("expected request snapshot, got %v", msg["source"])
	}
	entries, ok := msg["entries"].([]interface{})
	if !ok || len(entries) != 1 {
		t.Fatalf("expected 1 request entry, got %v", msg["entries"])
	}
	entry, ok := entries[0].(map[string]interface{})
	if !ok || !strings.Contains(entry["message"].(string), "request line") {
		t.Fatalf("expected request log entry, got %v", entries[0])
	}
}

func TestLogsWSKeepsIdleConnectionAlive(t *testing.T) {
	cfg := &config.Config{JWT: config.JWT{Secret: "secret"}}
	hub := panellog.NewHub()
	h := NewLogsWSHandler(cfg, hub)
	h.readTimeout = 120 * time.Millisecond
	h.pingInterval = 20 * time.Millisecond

	token, err := auth.GenerateToken(cfg.JWT.Secret, "admin", 1)
	if err != nil {
		t.Fatal(err)
	}

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

	msgCh := make(chan map[string]interface{}, 1)
	errCh := make(chan error, 1)
	go func() {
		var next map[string]interface{}
		errCh <- conn.ReadJSON(&next)
		msgCh <- next
	}()

	time.Sleep(3 * h.readTimeout)
	hub.Write(panellog.SourceRuntime, []byte("after idle\n"))

	select {
	case err := <-errCh:
		if err != nil {
			t.Fatalf("expected connection to stay alive after idle period: %v", err)
		}
		msg = <-msgCh
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for log entry after idle period")
	}
	if !strings.Contains(msg["message"].(string), "after idle") {
		t.Fatalf("expected after idle entry, got %v", msg)
	}
}
