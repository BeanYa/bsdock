package transport

import (
	"testing"

	"github.com/bsdock/agent/internal/config"
)

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
