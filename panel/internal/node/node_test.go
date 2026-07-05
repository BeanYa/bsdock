package node

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"path/filepath"
	"testing"

	"github.com/bsdock/panel/internal/db"
)

func newTestDB(t *testing.T) *db.Queries {
	t.Helper()
	path := filepath.Join(t.TempDir(), "test.db")
	sqlDB, err := db.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqlDB.Close() })
	return db.New(sqlDB)
}

func TestCreateNode(t *testing.T) {
	queries := newTestDB(t)
	svc := NewService(queries)
	node, token, err := svc.Create(context.Background(), "srv-01", "linux", "secret", 24)
	if err != nil {
		t.Fatal(err)
	}
	if node.Name != "srv-01" {
		t.Fatalf("expected srv-01, got %s", node.Name)
	}
	if node.Status != "pending" {
		t.Fatalf("expected pending, got %s", node.Status)
	}
	if token == "" {
		t.Fatal("expected non-empty install token")
	}
}

func TestListNodes(t *testing.T) {
	queries := newTestDB(t)
	svc := NewService(queries)
	if _, _, err := svc.Create(context.Background(), "srv-01", "linux", "secret", 24); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.Create(context.Background(), "srv-02", "linux", "secret", 24); err != nil {
		t.Fatal(err)
	}
	nodes, err := svc.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(nodes) != 2 {
		t.Fatalf("expected 2 nodes, got %d", len(nodes))
	}
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func TestServiceReset(t *testing.T) {
	queries := newTestDB(t)
	svc := NewService(queries)
	ctx := context.Background()

	n, token, err := svc.Create(ctx, "reset-node", "linux", "secret", 24)
	if err != nil {
		t.Fatal(err)
	}

	if err := queries.MarkInstallTokenUsed(ctx, n.ID); err != nil {
		t.Fatal(err)
	}
	if err := queries.UpdateNodeStatus(ctx, db.UpdateNodeStatusParams{Status: "online", ID: n.ID}); err != nil {
		t.Fatal(err)
	}

	originalHash := hashToken(token)

	resetNode, newToken, err := svc.Reset(ctx, n.ID, "secret", 24)
	if err != nil {
		t.Fatal(err)
	}
	if resetNode.Status != "pending" {
		t.Fatalf("expected pending, got %s", resetNode.Status)
	}
	if resetNode.TokenUsed {
		t.Fatal("expected token_used to be false after reset")
	}

	stored, err := queries.GetNode(ctx, n.ID)
	if err != nil {
		t.Fatal(err)
	}
	if stored.TokenHash != hashToken(newToken) {
		t.Fatal("expected stored token hash to match new token")
	}
	if stored.TokenHash == originalHash {
		t.Fatal("original token should no longer match stored hash")
	}
}
