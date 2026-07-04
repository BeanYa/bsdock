package db

import (
	"database/sql"
	_ "embed"
	"fmt"
	"net/url"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schema string

// Open opens a SQLite database at path, enables foreign keys, and applies the
// embedded schema. The caller is responsible for closing the returned *sql.DB.
func Open(path string) (*sql.DB, error) {
	q := url.Values{}
	q.Set("_pragma", "foreign_keys(1)")
	dsn := path + "?" + q.Encode()

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}
	if _, err := db.Exec(schema); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate schema: %w", err)
	}
	return db, nil
}
