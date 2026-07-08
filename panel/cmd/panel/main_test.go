package main

import (
	"testing"

	"github.com/bsdock/panel/internal/config"
)

func TestServerAddressUsesConfiguredAddress(t *testing.T) {
	cfg := &config.Config{Address: "127.0.0.1", Port: "10443"}
	if got := serverAddress(cfg); got != "127.0.0.1:10443" {
		t.Fatalf("expected 127.0.0.1:10443, got %s", got)
	}
}

func TestServerAddressAllowsAllInterfaces(t *testing.T) {
	cfg := &config.Config{Port: "8080"}
	if got := serverAddress(cfg); got != ":8080" {
		t.Fatalf("expected :8080, got %s", got)
	}
}

func TestTLSEnabledRequiresCertificateAndKey(t *testing.T) {
	if tlsEnabled(&config.Config{TLS: config.TLS{CertPath: "/cert.pem"}}) {
		t.Fatal("expected tls disabled without key")
	}
	if !tlsEnabled(&config.Config{TLS: config.TLS{CertPath: "/cert.pem", KeyPath: "/key.pem"}}) {
		t.Fatal("expected tls enabled with certificate and key")
	}
}
