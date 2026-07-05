package transport

import (
	"testing"

	"github.com/bsdock/agent/internal/collector"
	"github.com/bsdock/agent/internal/config"
)

func TestBuildReportPayload_IncludesRuntimeMetrics(t *testing.T) {
	cfg := &config.Config{Token: "tok"}
	c := NewClient(cfg)
	info := &collector.SystemInfo{
		CPUPercent:  42.5,
		MemoryUsed:  1024,
		MemoryFree:  2048,
		MemoryTotal: 3072,
	}
	payload := c.buildReportPayload(info)
	if payload["cpu_percent"] != 42.5 {
		t.Errorf("cpu_percent mismatch: got %v", payload["cpu_percent"])
	}
	if payload["memory_used"] != int64(1024) {
		t.Errorf("memory_used mismatch: got %v", payload["memory_used"])
	}
	if payload["memory_free"] != int64(2048) {
		t.Errorf("memory_free mismatch: got %v", payload["memory_free"])
	}
}

func TestBuildHeartbeat_IsMetricsType(t *testing.T) {
	cfg := &config.Config{Token: "tok"}
	c := NewClient(cfg)
	payload := c.buildHeartbeat()
	if payload["type"] != "metrics" {
		t.Errorf("expected type metrics, got %v", payload["type"])
	}
	if _, ok := payload["cpu_percent"]; !ok {
		t.Error("metrics missing cpu_percent")
	}
	if _, ok := payload["memory_used"]; !ok {
		t.Error("metrics missing memory_used")
	}
	if _, ok := payload["memory_free"]; !ok {
		t.Error("metrics missing memory_free")
	}
}

func TestClientModeAuto(t *testing.T) {
	cfg := &config.Config{
		PanelURL: "https://panel.local",
		Token:    "test-token",
		Mode:     "auto",
	}
	c := NewClient(cfg)
	if c == nil {
		t.Fatal("expected client")
	}
	if c.mode != "auto" {
		t.Fatalf("expected auto mode, got %s", c.mode)
	}
}
