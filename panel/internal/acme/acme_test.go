package acme

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestValidateRequestRequiresDomain(t *testing.T) {
	c := NewClient(WithCertDir(t.TempDir()))
	_, err := c.Obtain(context.Background(), Request{Email: "admin@example.com"})
	if err == nil {
		t.Fatal("expected missing domain error")
	}
}

func TestValidateRequestRejectsInvalidDomain(t *testing.T) {
	c := NewClient(WithCertDir(t.TempDir()))
	_, err := c.Obtain(context.Background(), Request{Domain: "not a domain", Email: "admin@example.com"})
	if err == nil {
		t.Fatal("expected invalid domain error")
	}
}

func TestSaveCertificateUsesDomainDirectory(t *testing.T) {
	dir := t.TempDir()
	c := NewClient(WithCertDir(dir))

	certPath, keyPath, err := c.saveCertificate("panel.example.com", []byte("cert"), []byte("key"))
	if err != nil {
		t.Fatalf("saveCertificate failed: %v", err)
	}

	wantCert := filepath.Join(dir, "panel.example.com", "fullchain.pem")
	wantKey := filepath.Join(dir, "panel.example.com", "privkey.pem")
	if certPath != wantCert || keyPath != wantKey {
		t.Fatalf("unexpected paths cert=%s key=%s", certPath, keyPath)
	}
	if got, err := os.ReadFile(certPath); err != nil || string(got) != "cert" {
		t.Fatalf("certificate content mismatch: %q err=%v", got, err)
	}
	if got, err := os.ReadFile(keyPath); err != nil || string(got) != "key" {
		t.Fatalf("key content mismatch: %q err=%v", got, err)
	}
}
