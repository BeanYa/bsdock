package auth

import (
	"testing"
	"time"
)

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("admin123")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword("admin123", hash) {
		t.Fatal("expected password to match")
	}
	if CheckPassword("wrong", hash) {
		t.Fatal("expected password to not match")
	}
}

func TestGenerateAndParseToken(t *testing.T) {
	secret := "test-secret"
	token, err := GenerateToken(secret, "admin", 1)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := ParseToken(secret, token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.Username != "admin" {
		t.Fatalf("expected admin, got %s", claims.Username)
	}
}

func TestExpiredToken(t *testing.T) {
	secret := "test-secret"
	token, err := GenerateToken(secret, "admin", -1)
	if err != nil {
		t.Fatal(err)
	}
	time.Sleep(1 * time.Second)
	_, err = ParseToken(secret, token)
	if err == nil {
		t.Fatal("expected expired token error")
	}
}
