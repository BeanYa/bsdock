package api

import (
	"bytes"
	"database/sql"
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

func setupAgentHandler(t *testing.T) (*sql.DB, *db.Queries, *config.Config, *node.Service, *mux.Router) {
	t.Helper()
	sqlDB, err := db.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqlDB.Close() })
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "secret", ExpireHours: 1}}
	svc := node.NewService(queries)
	h := NewAgentHTTPHandler(sqlDB, queries, cfg)
	r := mux.NewRouter()
	h.Register(r)
	return sqlDB, queries, cfg, svc, r
}

func TestAgentHTTPReport(t *testing.T) {
	_, _, _, svc, r := setupAgentHandler(t)

	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
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
	_, _, _, svc, r := setupAgentHandler(t)

	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
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

func TestAgentReportInvalidToken(t *testing.T) {
	_, _, _, _, r := setupAgentHandler(t)

	payload := map[string]interface{}{
		"token":    "not-a-valid-token",
		"hostname": "srv-01",
		"os":       "linux",
		"arch":     "amd64",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/v1/agent/report", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAgentReportMissingToken(t *testing.T) {
	_, _, _, _, r := setupAgentHandler(t)

	payload := map[string]interface{}{
		"hostname": "srv-01",
		"os":       "linux",
		"arch":     "amd64",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/v1/agent/report", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAgentReportMalformedJSON(t *testing.T) {
	_, _, _, _, r := setupAgentHandler(t)

	req := httptest.NewRequest("POST", "/api/v1/agent/report", strings.NewReader("not json"))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestAgentReportTokenReuse(t *testing.T) {
	_, _, _, svc, r := setupAgentHandler(t)

	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
	if err != nil {
		t.Fatal(err)
	}

	payload := map[string]interface{}{
		"token":    token,
		"hostname": "srv-01",
		"os":       "linux",
		"arch":     "amd64",
	}

	for i := 0; i < 2; i++ {
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest("POST", "/api/v1/agent/report", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("iteration %d: expected 200, got %d: %s", i, rec.Code, rec.Body.String())
		}
	}

	n, err := svc.Get(created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if n.Status != "online" {
		t.Fatalf("expected online, got %s", n.Status)
	}
	if !n.TokenUsed {
		t.Fatal("expected token to be marked used")
	}
}

func TestAgentReportDoesNotStoreToken(t *testing.T) {
	_, _, _, svc, r := setupAgentHandler(t)

	ctx := t.Context()
	created, token, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
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
	if n.SystemInfo == nil {
		t.Fatal("expected system_info to be stored")
	}
	if strings.Contains(string(n.SystemInfo), token) {
		t.Fatal("system_info must not contain the install token")
	}

	var info map[string]interface{}
	if err := json.Unmarshal(n.SystemInfo, &info); err != nil {
		t.Fatal(err)
	}
	if _, ok := info["token"]; ok {
		t.Fatal("system_info must not have a token field")
	}
}

func TestAgentReportNextReportSeconds(t *testing.T) {
	_, _, _, svc, r := setupAgentHandler(t)

	ctx := t.Context()
	_, token, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
	if err != nil {
		t.Fatal(err)
	}

	payload := map[string]interface{}{
		"token":    token,
		"hostname": "srv-01",
		"os":       "linux",
		"arch":     "amd64",
	}

	t.Run("http report", func(t *testing.T) {
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest("POST", "/api/v1/agent/report", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
		}
		var resp map[string]interface{}
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}
		if resp["next_report_seconds"] != float64(30) {
			t.Fatalf("expected next_report_seconds=30, got %v", resp["next_report_seconds"])
		}
	})

	t.Run("pull poll", func(t *testing.T) {
		body, _ := json.Marshal(payload)
		req := httptest.NewRequest("POST", "/api/v1/agent/poll", bytes.NewReader(body))
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
		}
		var resp map[string]interface{}
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}
		if resp["next_report_seconds"] != float64(10) {
			t.Fatalf("expected next_report_seconds=10, got %v", resp["next_report_seconds"])
		}
	})
}

func TestAgentReportInvalidTokenHash(t *testing.T) {
	_, queries, _, svc, r := setupAgentHandler(t)

	ctx := t.Context()
	created, originalToken, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
	if err != nil {
		t.Fatal(err)
	}

	// Manually change the stored token hash so the original token no longer matches.
	if _, err := queries.RotateInstallToken(ctx, db.RotateInstallTokenParams{
		ID:        created.ID,
		TokenHash: "deadbeef",
	}); err != nil {
		t.Fatal(err)
	}

	payload := map[string]interface{}{
		"token":    originalToken,
		"hostname": "srv-01",
		"os":       "linux",
		"arch":     "amd64",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/v1/agent/report", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}
