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
	if cfg.Address != "" {
		t.Fatalf("expected default address empty, got %s", cfg.Address)
	}
	if cfg.BaseURI != "/" {
		t.Fatalf("expected default base uri /, got %s", cfg.BaseURI)
	}
	if cfg.Timezone != "Asia/Shanghai" {
		t.Fatalf("expected timezone Asia/Shanghai, got %s", cfg.Timezone)
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
address: "127.0.0.1"
port: "9000"
base_uri: "/beanuai/"
domain: "panel.example.com"
panel_uri: "https://panel.example.com/beanuai/"
timezone: "Asia/Tokyo"
tls:
  cert_path: "/cert/fullchain.pem"
  key_path: "/cert/privkey.pem"
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
	if cfg.Address != "127.0.0.1" {
		t.Fatalf("expected address 127.0.0.1, got %s", cfg.Address)
	}
	if cfg.BaseURI != "/beanuai/" {
		t.Fatalf("expected base uri /beanuai/, got %s", cfg.BaseURI)
	}
	if cfg.Domain != "panel.example.com" {
		t.Fatalf("expected domain panel.example.com, got %s", cfg.Domain)
	}
	if cfg.PanelURI != "https://panel.example.com/beanuai/" {
		t.Fatalf("expected panel uri, got %s", cfg.PanelURI)
	}
	if cfg.Timezone != "Asia/Tokyo" {
		t.Fatalf("expected timezone Asia/Tokyo, got %s", cfg.Timezone)
	}
	if cfg.TLS.CertPath != "/cert/fullchain.pem" || cfg.TLS.KeyPath != "/cert/privkey.pem" {
		t.Fatalf("expected tls paths, got cert=%s key=%s", cfg.TLS.CertPath, cfg.TLS.KeyPath)
	}
	if cfg.Database.Path != "./test.db" {
		t.Fatalf("expected db path ./test.db, got %s", cfg.Database.Path)
	}
}

func TestEnvOverride(t *testing.T) {
	t.Setenv("BSDOCK_ADDRESS", "0.0.0.0")
	t.Setenv("BSDOCK_PORT", "7777")
	t.Setenv("BSDOCK_BASE_URI", "/panel/")
	t.Setenv("BSDOCK_DOMAIN", "env.example.com")
	t.Setenv("BSDOCK_PANEL_URI", "https://env.example.com/panel/")
	t.Setenv("BSDOCK_TLS_CERT_PATH", "/env/fullchain.pem")
	t.Setenv("BSDOCK_TLS_KEY_PATH", "/env/privkey.pem")
	t.Setenv("BSDOCK_TIMEZONE", "UTC")
	cfg, err := Load("")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != "7777" {
		t.Fatalf("expected env override 7777, got %s", cfg.Port)
	}
	if cfg.Address != "0.0.0.0" {
		t.Fatalf("expected env address override, got %s", cfg.Address)
	}
	if cfg.BaseURI != "/panel/" {
		t.Fatalf("expected env base uri override, got %s", cfg.BaseURI)
	}
	if cfg.Domain != "env.example.com" {
		t.Fatalf("expected env domain override, got %s", cfg.Domain)
	}
	if cfg.PanelURI != "https://env.example.com/panel/" {
		t.Fatalf("expected env panel uri override, got %s", cfg.PanelURI)
	}
	if cfg.TLS.CertPath != "/env/fullchain.pem" || cfg.TLS.KeyPath != "/env/privkey.pem" {
		t.Fatalf("expected env tls paths, got cert=%s key=%s", cfg.TLS.CertPath, cfg.TLS.KeyPath)
	}
	if cfg.Timezone != "UTC" {
		t.Fatalf("expected env timezone override, got %s", cfg.Timezone)
	}
}

func TestSaveRoundTrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	cfg := &Config{
		Mode:     "master",
		Address:  "127.0.0.1",
		Port:     "9443",
		BaseURI:  "/secure/",
		Domain:   "save.example.com",
		PanelURI: "https://save.example.com/secure/",
		Timezone: "Asia/Shanghai",
		TLS: TLS{
			CertPath: filepath.Join(dir, "fullchain.pem"),
			KeyPath:  filepath.Join(dir, "privkey.pem"),
		},
		Database: Database{Path: "./panel.db"},
		JWT:      JWT{Secret: "secret", ExpireHours: 24},
		Agent: Agent{
			AllowedModes:            []string{"websocket", "http", "pull"},
			DefaultMode:             "auto",
			HeartbeatTimeoutSeconds: 60,
		},
		Log: Log{Level: "info"},
	}

	if err := Save(path, cfg); err != nil {
		t.Fatalf("Save failed: %v", err)
	}
	loaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load after save failed: %v", err)
	}
	if loaded.Address != cfg.Address || loaded.Port != cfg.Port || loaded.BaseURI != cfg.BaseURI {
		t.Fatalf("round trip mismatch: %#v", loaded)
	}
	if loaded.TLS.CertPath != cfg.TLS.CertPath || loaded.TLS.KeyPath != cfg.TLS.KeyPath {
		t.Fatalf("tls round trip mismatch: %#v", loaded.TLS)
	}
}
