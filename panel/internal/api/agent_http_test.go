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
