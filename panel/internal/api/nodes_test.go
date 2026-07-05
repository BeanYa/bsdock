package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
)

func TestCreateNodeHandler(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	svc := node.NewService(db.New(sqlDB))
	cfg := &config.Config{JWT: config.JWT{Secret: "test-secret", ExpireHours: 1}}
	h := NewNodesHandler(svc, cfg)
	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	h.Register(apiRouter)

	body := []byte(`{"name":"srv-01"}`)
	req := httptest.NewRequest("POST", "/api/v1/nodes", bytes.NewReader(body))
	req.Header.Set("X-Panel-URL", "https://panel.local")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp createNodeResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Node.Name != "srv-01" {
		t.Fatalf("expected srv-01, got %s", resp.Node.Name)
	}
	if resp.Node.Platform != "linux" {
		t.Fatalf("expected linux platform by default, got %s", resp.Node.Platform)
	}
	if resp.InstallCommand == "" {
		t.Fatal("expected install command")
	}
}

func TestCreateNodeHandlerWindowsPlatform(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	svc := node.NewService(db.New(sqlDB))
	cfg := &config.Config{JWT: config.JWT{Secret: "test-secret", ExpireHours: 1}}
	h := NewNodesHandler(svc, cfg)
	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	h.Register(apiRouter)

	body := []byte(`{"name":"srv-02","platform":"windows"}`)
	req := httptest.NewRequest("POST", "/api/v1/nodes", bytes.NewReader(body))
	req.Header.Set("X-Panel-URL", "https://panel.local")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp createNodeResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Node.Platform != "windows" {
		t.Fatalf("expected windows, got %s", resp.Node.Platform)
	}
	if !strings.Contains(resp.InstallCommand, "install-agent.ps1") {
		t.Fatal("expected windows install command")
	}
}

func TestRotateTokenHandler(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	svc := node.NewService(queries)
	cfg := &config.Config{JWT: config.JWT{Secret: "test-secret", ExpireHours: 1}}
	h := NewNodesHandler(svc, cfg)
	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	h.Register(apiRouter)

	created, _, err := svc.Create(t.Context(), "srv-01", "windows", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest("POST", "/api/v1/nodes/"+created.ID+"/rotate-token", nil)
	req.Header.Set("X-Panel-URL", "https://panel.local")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp rotateTokenResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.InstallCommand == "" {
		t.Fatal("expected install command")
	}
	if !strings.Contains(resp.InstallCommand, "install-agent.ps1") {
		t.Fatal("expected windows install command after rotation")
	}

	nodeRow, err := queries.GetNode(t.Context(), created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if nodeRow.TokenUsed {
		t.Fatal("expected token_used to be false after rotation")
	}
	if nodeRow.TokenHash == "" {
		t.Fatal("expected token hash to be set after rotation")
	}
}

func TestRotateTokenHandlerNotFound(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	svc := node.NewService(db.New(sqlDB))
	cfg := &config.Config{JWT: config.JWT{Secret: "test-secret", ExpireHours: 1}}
	h := NewNodesHandler(svc, cfg)
	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	h.Register(apiRouter)

	req := httptest.NewRequest("POST", "/api/v1/nodes/nonexistent/rotate-token", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestResetHandler(t *testing.T) {
	sqlDB, _ := db.Open(":memory:")
	defer sqlDB.Close()
	queries := db.New(sqlDB)
	svc := node.NewService(queries)
	cfg := &config.Config{JWT: config.JWT{Secret: "test-secret", ExpireHours: 1}}
	h := NewNodesHandler(svc, cfg)
	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	h.Register(apiRouter)

	created, _, err := svc.Create(t.Context(), "srv-reset", "linux", cfg.JWT.Secret, cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}
	if err := queries.MarkInstallTokenUsed(t.Context(), created.ID); err != nil {
		t.Fatal(err)
	}
	if err := queries.UpdateNodeStatus(t.Context(), db.UpdateNodeStatusParams{Status: "online", ID: created.ID}); err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest("POST", "/api/v1/nodes/"+created.ID+"/reset", nil)
	req.Header.Set("X-Panel-URL", "https://panel.local")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp rotateTokenResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.InstallCommand == "" {
		t.Fatal("expected install command")
	}

	nodeRow, err := queries.GetNode(t.Context(), created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if nodeRow.Status != "pending" {
		t.Fatalf("expected pending, got %s", nodeRow.Status)
	}
	if nodeRow.TokenUsed {
		t.Fatal("expected token_used to be false after reset")
	}
}

func TestBuildInstallCommandWindows(t *testing.T) {
	panelURL := "https://panel.example.com"
	token := "test-token"
	cmd := buildInstallCommand("windows", panelURL, token)

	t.Logf("generated windows install command:\n%s", cmd)

	for _, want := range []string{
		"powershell -ExecutionPolicy Bypass -Command",
		"Invoke-WebRequest",
		"scripts/install-agent.ps1",
		"-OutFile 'bsdock-install.ps1'",
		".\\bsdock-install.ps1",
		"-PanelURL '" + panelURL + "'",
		"-Token '" + token + "'",
	} {
		if !strings.Contains(cmd, want) {
			t.Errorf("windows command missing %q:\n%s", want, cmd)
		}
	}

	if strings.Contains(cmd, "$env:TEMP") {
		t.Errorf("windows command should not rely on $env:TEMP, which bash will swallow:\n%s", cmd)
	}
}
