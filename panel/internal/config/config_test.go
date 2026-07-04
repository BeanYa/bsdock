package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load("")
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}
	if cfg.Port != "8080" {
		t.Fatalf("expected port 8080, got %s", cfg.Port)
	}
	if cfg.Agent.DefaultMode != "auto" {
		t.Fatalf("expected default mode auto, got %s", cfg.Agent.DefaultMode)
	}
}

func TestLoadFromFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	content := `
mode: master
port: "9000"
database:
  path: "./test.db"
`
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != "9000" {
		t.Fatalf("expected port 9000, got %s", cfg.Port)
	}
	if cfg.Database.Path != "./test.db" {
		t.Fatalf("expected db path ./test.db, got %s", cfg.Database.Path)
	}
}

func TestEnvOverride(t *testing.T) {
	t.Setenv("BSDOCK_PORT", "7777")
	cfg, err := Load("")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != "7777" {
		t.Fatalf("expected env override 7777, got %s", cfg.Port)
	}
}
