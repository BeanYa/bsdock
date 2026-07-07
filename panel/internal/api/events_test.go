package api

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFrontendEventHandlerLogsPageView(t *testing.T) {
	logs := captureStandardLog(t)
	h := NewFrontendEventHandler()

	body := []byte(`{"path":"/nodes","title":"Nodes","referrer":"/"}`)
	req := httptest.NewRequest("POST", "/api/v1/events/page-view", bytes.NewReader(body))
	req.RemoteAddr = "192.0.2.10:12345"
	req.Header.Set("User-Agent", "browser-test")
	req.Header.Set("Origin", "https://panel.local")
	rec := httptest.NewRecorder()
	h.PageView(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", rec.Code, rec.Body.String())
	}
	line := logs.String()
	for _, want := range []string{
		"frontend page_view",
		`path="/nodes"`,
		`title="Nodes"`,
		`referrer="/"`,
		`remote="192.0.2.10"`,
		`origin="https://panel.local"`,
		`user_agent="browser-test"`,
	} {
		if !strings.Contains(line, want) {
			t.Fatalf("page view log missing %q: %s", want, line)
		}
	}
}

func TestFrontendEventHandlerRejectsInvalidPageView(t *testing.T) {
	h := NewFrontendEventHandler()
	req := httptest.NewRequest("POST", "/api/v1/events/page-view", strings.NewReader(`{"path":""}`))
	rec := httptest.NewRecorder()
	h.PageView(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}
