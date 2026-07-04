package node

import (
	"context"
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
	node, token, err := svc.Create(context.Background(), "srv-01", "https://panel.local", "secret", 24)
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
	if _, _, err := svc.Create(context.Background(), "srv-01", "https://panel.local", "secret", 24); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.Create(context.Background(), "srv-02", "https://panel.local", "secret", 24); err != nil {
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
