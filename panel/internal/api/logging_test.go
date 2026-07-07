package api

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	panellog "github.com/bsdock/panel/internal/log"
)

func TestRequestLoggingMiddlewareIncludesSourceContext(t *testing.T) {
	var out bytes.Buffer
	logger := log.New(&out, "", 0)
	hub := panellog.NewHub()
	handler := RequestLoggingMiddleware(logger, hub)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest("POST", "/api/v1/nodes?filter=online", strings.NewReader("{}"))
	req.RemoteAddr = "192.0.2.10:12345"
	req.Header.Set("User-Agent", "browser-test")
	req.Header.Set("Referer", "https://panel.local/nodes")
	req.Header.Set("Origin", "https://panel.local")
	req.Header.Set("X-Forwarded-For", "198.51.100.20")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	line := out.String()
	for _, want := range []string{
		`method="POST"`,
		`path="/api/v1/nodes?filter=online"`,
		`status=201`,
		`remote="192.0.2.10"`,
		`forwarded_for="198.51.100.20"`,
		`origin="https://panel.local"`,
		`referer="https://panel.local/nodes"`,
		`user_agent="browser-test"`,
	} {
		if !strings.Contains(line, want) {
			t.Fatalf("request log missing %q: %s", want, line)
		}
	}

	snap := hub.Snapshot(panellog.SourceRequest)
	if len(snap) != 1 || !strings.Contains(snap[0].Message, `path="/api/v1/nodes?filter=online"`) {
		t.Fatalf("expected enriched request log in hub, got %#v", snap)
	}
}
