package api

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"unicode/utf16"

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
	if resp.InstallCommand == "" {
		t.Fatal("expected install command")
	}
}

func decodePowerShellCommand(encoded string) (string, error) {
	b, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	u16 := make([]uint16, len(b)/2)
	for i := range u16 {
		u16[i] = binary.LittleEndian.Uint16(b[i*2:])
	}
	return string(utf16.Decode(u16)), nil
}

func TestBuildInstallCommandWindowsEncoded(t *testing.T) {
	panelURL := "https://panel.example.com"
	token := "test-token"
	cmd := buildInstallCommand("windows", panelURL, token)

	prefix := "powershell -ExecutionPolicy Bypass -EncodedCommand "
	if !strings.HasPrefix(cmd, prefix) {
		t.Fatalf("unexpected windows command prefix: %s", cmd)
	}

	decoded, err := decodePowerShellCommand(strings.TrimPrefix(cmd, prefix))
	if err != nil {
		t.Fatalf("failed to decode command: %v", err)
	}
	t.Logf("generated windows install command (raw):\n%s", cmd)
	t.Logf("generated windows install command (decoded):\n%s", decoded)

	for _, want := range []string{
		"Invoke-WebRequest",
		"bsdock-install.ps1",
		"-PanelURL '" + panelURL + "'",
		"-Token '" + token + "'",
		"$env:TEMP",
	} {
		if !strings.Contains(decoded, want) {
			t.Errorf("decoded command missing %q:\n%s", want, decoded)
		}
	}
}
