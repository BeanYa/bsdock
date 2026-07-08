package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	panelacme "github.com/bsdock/panel/internal/acme"
	"github.com/bsdock/panel/internal/config"
)

type fakeACMEIssuer struct {
	req panelacme.Request
}

func (f *fakeACMEIssuer) Obtain(ctx context.Context, req panelacme.Request) (*panelacme.Result, error) {
	f.req = req
	return &panelacme.Result{
		Domain:   req.Domain,
		CertPath: filepath.Join("cert", req.Domain, "fullchain.pem"),
		KeyPath:  filepath.Join("cert", req.Domain, "privkey.pem"),
	}, nil
}

func TestSettingsHandlerGetAndSave(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	cfg := &config.Config{
		Mode:     "master",
		Port:     "8080",
		BaseURI:  "/",
		Timezone: "Asia/Shanghai",
		Database: config.Database{Path: "./panel.db"},
		JWT:      config.JWT{Secret: "secret", ExpireHours: 24},
	}
	h := NewSettingsHandler(cfg, path, t.TempDir(), nil)

	body := []byte(`{
		"address":"127.0.0.1",
		"port":"10443",
		"base_uri":"/beanuai/",
		"domain":"panel.example.com",
		"panel_uri":"https://panel.example.com/beanuai/",
		"tls_cert_path":"/cert/fullchain.pem",
		"tls_key_path":"/cert/privkey.pem",
		"timezone":"UTC"
	}`)
	req := httptest.NewRequest("PUT", "/api/v1/settings", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Save(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	loaded, err := config.Load(path)
	if err != nil {
		t.Fatalf("load saved config: %v", err)
	}
	if loaded.Port != "10443" || loaded.BaseURI != "/beanuai/" || loaded.TLS.CertPath != "/cert/fullchain.pem" {
		t.Fatalf("saved config mismatch: %#v", loaded)
	}

	req = httptest.NewRequest("GET", "/api/v1/settings", nil)
	rec = httptest.NewRecorder()
	h.Get(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp settingsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Domain != "panel.example.com" || resp.TLSKeyPath != "/cert/privkey.pem" {
		t.Fatalf("response mismatch: %#v", resp)
	}
}

func TestSettingsHandlerRejectsInvalidPort(t *testing.T) {
	h := NewSettingsHandler(&config.Config{Port: "8080", BaseURI: "/"}, filepath.Join(t.TempDir(), "config.yaml"), t.TempDir(), nil)
	req := httptest.NewRequest("PUT", "/api/v1/settings", bytes.NewReader([]byte(`{"port":"70000","base_uri":"/"}`)))
	rec := httptest.NewRecorder()
	h.Save(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestSettingsHandlerACMEBackfillsTLSPaths(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	cfg := &config.Config{Port: "8080", BaseURI: "/", Timezone: "Asia/Shanghai"}
	issuer := &fakeACMEIssuer{}
	h := NewSettingsHandler(cfg, path, filepath.Join(dir, "cert"), issuer)

	body := []byte(`{"domain":"panel.example.com","email":"admin@example.com"}`)
	req := httptest.NewRequest("POST", "/api/v1/settings/acme", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.RequestACME(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	if issuer.req.Domain != "panel.example.com" || issuer.req.Email != "admin@example.com" {
		t.Fatalf("issuer request mismatch: %#v", issuer.req)
	}
	if cfg.Domain != "panel.example.com" || cfg.TLS.CertPath == "" || cfg.TLS.KeyPath == "" {
		t.Fatalf("config not backfilled: %#v", cfg)
	}

	var resp acmeResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.TLSCertPath == "" || resp.TLSKeyPath == "" {
		t.Fatalf("missing tls paths in response: %#v", resp)
	}
}
