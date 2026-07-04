package db

import (
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
