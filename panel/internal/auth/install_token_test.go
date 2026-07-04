package auth

import (
	"testing"
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
