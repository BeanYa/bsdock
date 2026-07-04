package transport

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bsdock/agent/internal/config"
)

func TestPollOnce_HonorsNextReportSeconds(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]int{"next_report_seconds": 12})
	}))
	defer server.Close()

	cfg := &config.Config{
		PanelURL: server.URL,
		Token:    "test-token",
		Mode:     "pull",
	}
	c := NewClient(cfg)

	req, err := http.NewRequestWithContext(context.Background(), "POST", server.URL, nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}

	connected := false
	interval := c.pollOnce(req, &connected)

	if interval != 12*time.Second {
		t.Fatalf("expected interval 12s, got %v", interval)
	}
	if !connected {
		t.Fatal("expected connected to be true after first successful poll")
	}
}

func TestPollOnce_DefaultIntervalOnError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	cfg := &config.Config{
		PanelURL: server.URL,
		Token:    "test-token",
		Mode:     "pull",
	}
	c := NewClient(cfg)

	req, err := http.NewRequestWithContext(context.Background(), "POST", server.URL, nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}

	connected := false
	interval := c.pollOnce(req, &connected)

	if interval != 10*time.Second {
		t.Fatalf("expected default interval 10s, got %v", interval)
	}
	if connected {
		t.Fatal("expected connected to remain false after failed poll")
	}
}

func TestPollOnce_EnforcesMinimumInterval(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]int{"next_report_seconds": 2})
	}))
	defer server.Close()

	cfg := &config.Config{
		PanelURL: server.URL,
		Token:    "test-token",
		Mode:     "pull",
	}
	c := NewClient(cfg)

	req, err := http.NewRequestWithContext(context.Background(), "POST", server.URL, nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}

	connected := false
	interval := c.pollOnce(req, &connected)

	if interval != 10*time.Second {
		t.Fatalf("expected minimum interval 10s, got %v", interval)
	}
}
