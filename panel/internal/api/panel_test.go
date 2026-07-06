package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
)

func TestPanelStatusHandler(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	svc := node.NewService(db.New(sqlDB))
	cfg := &config.Config{JWT: config.JWT{Secret: "test-secret", ExpireHours: 1}}
	hub := wshub.NewHub()
	go hub.Run()

	if _, _, err := svc.Create(t.Context(), "node-01", "linux", cfg.JWT.Secret, cfg.JWT.ExpireHours); err != nil {
		t.Fatal(err)
	}

	h := NewPanelStatusHandler(svc, cfg, hub, time.Now())
	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	h.Register(apiRouter)

	req := httptest.NewRequest("GET", "/api/v1/panel/status", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp panelStatusResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}

	if resp.Version == "" {
		t.Fatal("expected version")
	}
	if resp.GoVersion == "" {
		t.Fatal("expected go_version")
	}
	if resp.Nodes.Total != 1 {
		t.Fatalf("expected 1 node, got %d", resp.Nodes.Total)
	}
}
