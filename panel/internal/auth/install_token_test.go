package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestInstallToken(t *testing.T) {
	secret := "install-secret"
	nodeID := "abc123"
	token, err := GenerateInstallToken(secret, nodeID, 1)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := ParseInstallToken(secret, token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.NodeID != nodeID {
		t.Fatalf("expected %s, got %s", nodeID, claims.NodeID)
	}
}

func TestInstallTokenIgnoresJWTExpiry(t *testing.T) {
	secret := "install-secret"
	nodeID := "abc123"
	claims := InstallClaims{
		NodeID: nodeID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	parsed, err := ParseInstallToken(secret, token)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.NodeID != nodeID {
		t.Fatalf("expected %s, got %s", nodeID, parsed.NodeID)
	}
}
