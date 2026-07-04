package db

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
)

func TestOpen(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec("SELECT 1 FROM users LIMIT 1")
	if err != nil {
		t.Fatalf("users table not ready: %v", err)
	}
}

func openTestDB(t *testing.T) *Queries {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return New(db)
}

func TestUserRoundTrip(t *testing.T) {
	ctx := context.Background()
	q := openTestDB(t)

	created, err := q.CreateUser(ctx, CreateUserParams{
		Username:     "alice",
		PasswordHash: "hashed-secret",
	})
	if err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if created.Username != "alice" {
		t.Errorf("created username = %q, want alice", created.Username)
	}

	got, err := q.GetUserByUsername(ctx, "alice")
	if err != nil {
		t.Fatalf("GetUserByUsername: %v", err)
	}
	if got.ID != created.ID || got.Username != created.Username || got.PasswordHash != created.PasswordHash {
		t.Errorf("GetUserByUsername returned %+v, want %+v", got, created)
	}
	if got.CreatedAt.IsZero() {
		t.Error("user CreatedAt is zero")
	}
}

func TestNodeRoundTrip(t *testing.T) {
	ctx := context.Background()
	q := openTestDB(t)

	node, err := q.CreateNode(ctx, CreateNodeParams{
		ID:        "node-1",
		Name:      "Node One",
		Status:    "pending",
		TokenHash: "token-hash",
	})
	if err != nil {
		t.Fatalf("CreateNode: %v", err)
	}
	if node.TokenUsed {
		t.Error("new node should not have token_used set")
	}

	got, err := q.GetNode(ctx, "node-1")
	if err != nil {
		t.Fatalf("GetNode: %v", err)
	}
	if got.ID != node.ID || got.Name != node.Name || got.Status != node.Status || got.TokenHash != node.TokenHash {
		t.Errorf("GetNode returned %+v, want %+v", got, node)
	}

	node2, err := q.CreateNode(ctx, CreateNodeParams{
		ID:        "node-2",
		Name:      "Node Two",
		Status:    "offline",
		TokenHash: "token-hash-2",
	})
	if err != nil {
		t.Fatalf("CreateNode second: %v", err)
	}

	list, err := q.ListNodes(ctx)
	if err != nil {
		t.Fatalf("ListNodes: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("ListNodes len = %d, want 2", len(list))
	}
	ids := map[string]bool{}
	for _, n := range list {
		ids[n.ID] = true
	}
	if !ids[node.ID] || !ids[node2.ID] {
		t.Errorf("ListNodes missing expected nodes: %+v", list)
	}
}

func TestNodeUpdates(t *testing.T) {
	ctx := context.Background()
	q := openTestDB(t)

	_, err := q.CreateNode(ctx, CreateNodeParams{
		ID:        "node-1",
		Name:      "Node One",
		Status:    "pending",
		TokenHash: "token-hash",
	})
	if err != nil {
		t.Fatalf("CreateNode: %v", err)
	}

	if err := q.UpdateNodeStatus(ctx, UpdateNodeStatusParams{Status: "online", ID: "node-1"}); err != nil {
		t.Fatalf("UpdateNodeStatus: %v", err)
	}
	got, err := q.GetNode(ctx, "node-1")
	if err != nil {
		t.Fatalf("GetNode after status update: %v", err)
	}
	if got.Status != "online" {
		t.Errorf("status = %q, want online", got.Status)
	}
	if !got.LastSeenAt.Valid {
		t.Error("LastSeenAt not set after status update")
	}

	if err := q.UpdateNodeSystemInfo(ctx, UpdateNodeSystemInfoParams{
		SystemInfo: sql.NullString{String: "os:linux", Valid: true},
		ID:         "node-1",
	}); err != nil {
		t.Fatalf("UpdateNodeSystemInfo: %v", err)
	}
	got, err = q.GetNode(ctx, "node-1")
	if err != nil {
		t.Fatalf("GetNode after system info update: %v", err)
	}
	if !got.SystemInfo.Valid || got.SystemInfo.String != "os:linux" {
		t.Errorf("system_info = %+v, want {String:\"os:linux\" Valid:true}", got.SystemInfo)
	}

	if err := q.MarkInstallTokenUsed(ctx, "node-1"); err != nil {
		t.Fatalf("MarkInstallTokenUsed: %v", err)
	}
	got, err = q.GetNode(ctx, "node-1")
	if err != nil {
		t.Fatalf("GetNode after token used: %v", err)
	}
	if !got.TokenUsed {
		t.Error("TokenUsed = false, want true")
	}
}
