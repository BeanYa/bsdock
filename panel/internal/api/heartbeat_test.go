package api

import (
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
)

func setupHeartbeatTest(t *testing.T) (*sql.DB, *db.Queries, *node.Service, *wshub.Hub) {
	t.Helper()

	// Use a file-backed database to match the datetime formatting behavior of
	// the production panel. In-memory databases can store CURRENT_TIMESTAMP in
	// a different format, which hides the string-comparison bug tested below.
	dir := t.TempDir()
	sqlDB, err := db.Open(filepath.Join(dir, "panel.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { sqlDB.Close() })

	queries := db.New(sqlDB)
	svc := node.NewService(queries)
	hub := wshub.NewHub()
	go hub.Run()

	return sqlDB, queries, svc, hub
}

func TestHeartbeatMonitorKeepsRecentNodeOnline(t *testing.T) {
	_, queries, svc, hub := setupHeartbeatTest(t)

	ctx := t.Context()
	created, _, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
	if err != nil {
		t.Fatal(err)
	}

	// Simulate a recent heartbeat by marking the node online.
	if err := queries.UpdateNodeStatus(ctx, db.UpdateNodeStatusParams{Status: "online", ID: created.ID}); err != nil {
		t.Fatal(err)
	}

	// Start the monitor with a 2s timeout so it ticks every 1s.
	cfg := config.Agent{HeartbeatTimeoutSeconds: 2}
	StartHeartbeatMonitor(svc, queries, hub, cfg)

	// Wait long enough for at least one tick to run.
	time.Sleep(1500 * time.Millisecond)

	n, err := svc.Get(created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if n.Status != "online" {
		t.Fatalf("expected node to stay online, got %s", n.Status)
	}
}

// TestListStaleOnlineNodesComparesDatetimesCorrectly directly verifies that
// the stale-node query compares last_seen_at as a datetime value rather than
// as a plain string. With file-backed SQLite, CURRENT_TIMESTAMP produces
// values like "2026-07-04 15:05:17" while the Go driver binds time.Time as
// "2026-07-04T15:05:17Z". A naive string comparison treats the space-formatted
// value as less than the T-formatted threshold, incorrectly marking recently
// active nodes as stale.
func TestListStaleOnlineNodesComparesDatetimesCorrectly(t *testing.T) {
	_, queries, svc, _ := setupHeartbeatTest(t)

	ctx := t.Context()
	created, _, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
	if err != nil {
		t.Fatal(err)
	}

	// Set last_seen_at via CURRENT_TIMESTAMP to obtain the production format.
	if err := queries.UpdateNodeStatus(ctx, db.UpdateNodeStatusParams{Status: "online", ID: created.ID}); err != nil {
		t.Fatal(err)
	}

	// Ask for nodes older than one second. A recent heartbeat should not be
	// considered stale.
	threshold := time.Now().Add(-time.Second).UTC().Format("2006-01-02 15:04:05")
	rows, err := queries.ListStaleOnlineNodes(ctx, threshold)
	if err != nil {
		t.Fatal(err)
	}
	for _, row := range rows {
		if row.ID == created.ID {
			t.Fatalf("recent node %s was incorrectly listed as stale", created.ID)
		}
	}
}

func TestListStaleOnlineNodesFindsOldNodes(t *testing.T) {
	sqlDB, queries, svc, _ := setupHeartbeatTest(t)

	ctx := t.Context()
	created, _, err := svc.Create(ctx, "srv-01", "linux", "secret", 1)
	if err != nil {
		t.Fatal(err)
	}

	// Insert an old online node manually.
	if _, err := sqlDB.Exec(
		"UPDATE nodes SET status = 'online', last_seen_at = '2026-01-01 00:00:00' WHERE id = ?",
		created.ID,
	); err != nil {
		t.Fatal(err)
	}

	threshold := time.Now().UTC().Format("2006-01-02 15:04:05")
	rows, err := queries.ListStaleOnlineNodes(ctx, threshold)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, row := range rows {
		if row.ID == created.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("old node %s was not listed as stale", created.ID)
	}
}
