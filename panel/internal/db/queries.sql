-- name: CreateUser :one
INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id, username, password_hash, created_at;

-- name: GetUserByUsername :one
SELECT id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1;

-- name: CreateNode :one
INSERT INTO nodes (id, name, status, token_hash) VALUES (?, ?, ?, ?)
RETURNING id, name, status, token_hash, system_info, token_used, last_seen_at, created_at;

-- name: GetNode :one
SELECT id, name, status, token_hash, system_info, token_used, last_seen_at, created_at FROM nodes WHERE id = ? LIMIT 1;

-- name: ListNodes :many
SELECT id, name, status, token_hash, system_info, token_used, last_seen_at, created_at FROM nodes ORDER BY created_at DESC;

-- name: UpdateNodeStatus :exec
UPDATE nodes SET status = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?;

-- name: UpdateNodeSystemInfo :exec
UPDATE nodes SET system_info = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?;

-- name: MarkInstallTokenUsed :exec
UPDATE nodes SET token_used = TRUE WHERE id = ?;

-- name: ListStaleOnlineNodes :many
SELECT id, name, status, token_hash, system_info, token_used, last_seen_at, created_at FROM nodes WHERE status = 'online' AND (last_seen_at IS NULL OR last_seen_at < ?) ORDER BY created_at DESC;

-- name: MarkNodeOffline :exec
UPDATE nodes SET status = 'offline' WHERE id = ? AND status = 'online';

-- name: CreateNodeReport :one
INSERT INTO node_reports (node_id, payload) VALUES (?, ?) RETURNING id, node_id, payload, reported_at;
