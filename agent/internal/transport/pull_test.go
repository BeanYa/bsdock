package transport

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bsdock/agent/internal/collector"
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

func TestRunPullCollectsFreshMetricsForEachPoll(t *testing.T) {
	var bodies []map[string]interface{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
			return
		}
		var payload map[string]interface{}
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Errorf("decode body: %v", err)
			return
		}
		bodies = append(bodies, payload)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]int{"next_report_seconds": 5})
	}))
	defer server.Close()

	cfg := &config.Config{
		PanelURL: server.URL,
		Token:    "test-token",
		Mode:     "pull",
	}
	c := NewClient(cfg)

	collectCalls := 0
	originalCollect := collectSystemInfo
	collectSystemInfo = func() (*collector.SystemInfo, error) {
		collectCalls++
		return &collector.SystemInfo{
			CPUPercent: float64(collectCalls * 10),
			MemoryUsed: int64(collectCalls * 100),
			MemoryFree: int64(collectCalls * 200),
		}, nil
	}
	defer func() { collectSystemInfo = originalCollect }()

	ctx, cancel := context.WithCancel(context.Background())
	originalWait := waitForNextPoll
	waitForNextPoll = func(ctx context.Context, _ time.Duration) bool {
		if len(bodies) >= 2 {
			cancel()
			return false
		}
		return true
	}
	defer func() { waitForNextPoll = originalWait }()

	err := c.runPull(ctx, &collector.SystemInfo{CPUPercent: 1, MemoryUsed: 1, MemoryFree: 1})
	if err != context.Canceled {
		t.Fatalf("expected context canceled, got %v", err)
	}
	if len(bodies) < 2 {
		t.Fatalf("expected at least two poll requests, got %d", len(bodies))
	}
	if bodies[0]["cpu_percent"] == bodies[1]["cpu_percent"] {
		t.Fatalf("expected fresh metrics on second poll, got %v then %v", bodies[0], bodies[1])
	}
}
