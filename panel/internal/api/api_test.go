package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	wshub "github.com/bsdock/panel/internal/websocket"
)

func setupAuthTest(t *testing.T) (*db.Queries, *config.Config, *sql.DB) {
	t.Helper()
	sqlDB, err := db.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqlDB.Close() })
	queries := db.New(sqlDB)
	cfg := &config.Config{JWT: config.JWT{Secret: "test-secret", ExpireHours: 1}}
	return queries, cfg, sqlDB
}

func captureStandardLog(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	original := log.Writer()
	log.SetOutput(&buf)
	t.Cleanup(func() { log.SetOutput(original) })
	t.Cleanup(func() { log.SetFlags(log.LstdFlags) })
	log.SetFlags(0)
	return &buf
}

func TestAuthMiddlewareAllowsPublicPaths(t *testing.T) {
	_, cfg, _ := setupAuthTest(t)
	handler := AuthMiddleware(cfg)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	paths := []string{"/api/v1/login", "/api/v1/agent/report", "/api/v1/agent/ws"}
	for _, path := range paths {
		req := httptest.NewRequest("GET", path, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 for %s, got %d", path, rec.Code)
		}
	}
}

func TestAuthMiddlewareRejectsMissingToken(t *testing.T) {
	_, cfg, _ := setupAuthTest(t)
	handler := AuthMiddleware(cfg)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called without auth")
	}))
	req := httptest.NewRequest("GET", "/api/v1/nodes", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestAuthMiddlewareRejectsMalformedToken(t *testing.T) {
	_, cfg, _ := setupAuthTest(t)
	handler := AuthMiddleware(cfg)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called with bad auth")
	}))
	req := httptest.NewRequest("GET", "/api/v1/nodes", nil)
	req.Header.Set("Authorization", "Basic admin:pass")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestAuthMiddlewareAcceptsValidToken(t *testing.T) {
	_, cfg, _ := setupAuthTest(t)
	token, err := auth.GenerateToken(cfg.JWT.Secret, "admin", cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}
	var username string
	handler := AuthMiddleware(cfg)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username = r.Context().Value(ContextUsername).(string)
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest("GET", "/api/v1/nodes", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if username != "admin" {
		t.Fatalf("expected admin, got %s", username)
	}
}

func TestAuthHandlerLoginSuccess(t *testing.T) {
	queries, cfg, _ := setupAuthTest(t)
	hash, _ := auth.HashPassword("admin123")
	_, err := queries.CreateUser(context.Background(), db.CreateUserParams{
		Username:     "admin",
		PasswordHash: hash,
	})
	if err != nil {
		t.Fatal(err)
	}
	h := NewAuthHandler(queries, cfg)
	body := []byte(`{"username":"admin","password":"admin123"}`)
	req := httptest.NewRequest("POST", "/api/v1/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Login(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp loginResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Token == "" {
		t.Fatal("expected token")
	}
}

func TestAuthHandlerLoginWritesRuntimeLog(t *testing.T) {
	logs := captureStandardLog(t)
	queries, cfg, _ := setupAuthTest(t)
	hash, _ := auth.HashPassword("admin123")
	_, err := queries.CreateUser(context.Background(), db.CreateUserParams{
		Username:     "admin",
		PasswordHash: hash,
	})
	if err != nil {
		t.Fatal(err)
	}
	h := NewAuthHandler(queries, cfg)

	body := []byte(`{"username":"admin","password":"admin123"}`)
	req := httptest.NewRequest("POST", "/api/v1/login", bytes.NewReader(body))
	req.RemoteAddr = "192.0.2.10:12345"
	req.Header.Set("User-Agent", "browser-test")
	req.Header.Set("Origin", "https://panel.local")
	rec := httptest.NewRecorder()
	h.Login(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	line := logs.String()
	for _, want := range []string{
		"auth login success",
		`username="admin"`,
		`remote="192.0.2.10"`,
		`origin="https://panel.local"`,
		`user_agent="browser-test"`,
	} {
		if !strings.Contains(line, want) {
			t.Fatalf("login log missing %q: %s", want, line)
		}
	}
}

func TestAuthHandlerLoginFailureWritesRuntimeLog(t *testing.T) {
	logs := captureStandardLog(t)
	queries, cfg, _ := setupAuthTest(t)
	hash, _ := auth.HashPassword("admin123")
	_, err := queries.CreateUser(context.Background(), db.CreateUserParams{
		Username:     "admin",
		PasswordHash: hash,
	})
	if err != nil {
		t.Fatal(err)
	}
	h := NewAuthHandler(queries, cfg)

	body := []byte(`{"username":"admin","password":"wrong"}`)
	req := httptest.NewRequest("POST", "/api/v1/login", bytes.NewReader(body))
	req.RemoteAddr = "192.0.2.10:12345"
	rec := httptest.NewRecorder()
	h.Login(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	line := logs.String()
	if !strings.Contains(line, "auth login failed") || !strings.Contains(line, `username="admin"`) || !strings.Contains(line, `reason="bad_password"`) {
		t.Fatalf("expected failed login log, got %s", line)
	}
	if strings.Contains(line, "wrong") {
		t.Fatalf("login log should not contain password: %s", line)
	}
}

func TestAuthHandlerLoginInvalidPassword(t *testing.T) {
	queries, cfg, _ := setupAuthTest(t)
	hash, _ := auth.HashPassword("admin123")
	_, err := queries.CreateUser(context.Background(), db.CreateUserParams{
		Username:     "admin",
		PasswordHash: hash,
	})
	if err != nil {
		t.Fatal(err)
	}
	h := NewAuthHandler(queries, cfg)
	body := []byte(`{"username":"admin","password":"wrong"}`)
	req := httptest.NewRequest("POST", "/api/v1/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Login(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestAuthHandlerLoginUnknownUser(t *testing.T) {
	queries, cfg, _ := setupAuthTest(t)
	h := NewAuthHandler(queries, cfg)
	body := []byte(`{"username":"nobody","password":"pass"}`)
	req := httptest.NewRequest("POST", "/api/v1/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Login(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestStaticHandler(t *testing.T) {
	handler, err := StaticHandler()
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("GET", "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Body.String() == "" {
		t.Fatal("expected body")
	}
	if !strings.Contains(rec.Body.String(), "BSDock Panel") {
		t.Fatal("expected static index.html content")
	}
}

func TestStaticFilesArePublic(t *testing.T) {
	_, cfg, _ := setupAuthTest(t)

	static, err := StaticHandler()
	if err != nil {
		t.Fatal(err)
	}

	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	apiRouter.Use(AuthMiddleware(cfg))
	apiRouter.HandleFunc("/nodes", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}).Methods("GET")
	r.PathPrefix("/").Handler(static)

	// Static index should be reachable without auth
	req := httptest.NewRequest("GET", "/", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected static 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "BSDock Panel") {
		t.Fatal("expected static index.html content")
	}

	// Protected API should still require auth
	req = httptest.NewRequest("GET", "/api/v1/nodes", nil)
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for nodes, got %d", rec.Code)
	}
}

func TestAuthMiddlewareOnRouter(t *testing.T) {
	queries, cfg, _ := setupAuthTest(t)
	hash, _ := auth.HashPassword("admin123")
	_, err := queries.CreateUser(context.Background(), db.CreateUserParams{
		Username:     "admin",
		PasswordHash: hash,
	})
	if err != nil {
		t.Fatal(err)
	}

	authHandler := NewAuthHandler(queries, cfg)
	r := mux.NewRouter()
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	apiRouter.Use(AuthMiddleware(cfg))
	apiRouter.HandleFunc("/login", authHandler.Login).Methods("POST")
	apiRouter.HandleFunc("/nodes", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, map[string]string{"ok": "yes"})
	}).Methods("GET")

	// Public login should work without auth
	body := []byte(`{"username":"admin","password":"admin123"}`)
	req := httptest.NewRequest("POST", "/api/v1/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected login 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Protected route without auth should fail
	req = httptest.NewRequest("GET", "/api/v1/nodes", nil)
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for nodes, got %d", rec.Code)
	}
}

func TestFrontendWSRequiresToken(t *testing.T) {
	queries, cfg, _ := setupAuthTest(t)
	hash, _ := auth.HashPassword("admin123")
	_, err := queries.CreateUser(context.Background(), db.CreateUserParams{
		Username:     "admin",
		PasswordHash: hash,
	})
	if err != nil {
		t.Fatal(err)
	}

	hub := wshub.NewHub()
	frontendWS := NewFrontendWSHandler(hub, cfg)
	r := mux.NewRouter()
	frontendWS.Register(r)

	// Missing token should return 401
	req := httptest.NewRequest("GET", "/ws?node_id=n1", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for missing token, got %d", rec.Code)
	}

	// Invalid token should return 401
	req = httptest.NewRequest("GET", "/ws?node_id=n1&token=bad", nil)
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid token, got %d", rec.Code)
	}

	// Missing node_id with valid token should return 400
	token, err := auth.GenerateToken(cfg.JWT.Secret, "admin", cfg.JWT.ExpireHours)
	if err != nil {
		t.Fatal(err)
	}
	req = httptest.NewRequest("GET", "/ws?token="+token, nil)
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing node_id, got %d", rec.Code)
	}
}
