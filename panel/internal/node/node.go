package node

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/db"
)

type Node struct {
	ID         string          `json:"id"`
	Name       string          `json:"name"`
	Status     string          `json:"status"`
	TokenHash  string          `json:"-"`
	SystemInfo json.RawMessage `json:"system_info,omitempty"`
	TokenUsed  bool            `json:"token_used"`
	LastSeenAt *time.Time      `json:"last_seen_at,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

type Service struct {
	queries *db.Queries
}

func NewService(q *db.Queries) *Service {
	return &Service{queries: q}
}

func (s *Service) Create(ctx context.Context, name, panelURL, jwtSecret string, expireHours int) (*Node, string, error) {
	idBytes := make([]byte, 16)
	if _, err := rand.Read(idBytes); err != nil {
		return nil, "", err
	}
	id := hex.EncodeToString(idBytes)

	token, err := auth.GenerateInstallToken(jwtSecret, id, expireHours)
	if err != nil {
		return nil, "", err
	}

	hashBytes := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hashBytes[:])

	row, err := s.queries.CreateNode(ctx, db.CreateNodeParams{
		ID:        id,
		Name:      name,
		Status:    "pending",
		TokenHash: tokenHash,
	})
	if err != nil {
		return nil, "", err
	}

	n := fromDB(row)
	return &n, token, nil
}

func (s *Service) List() ([]Node, error) {
	rows, err := s.queries.ListNodes(context.Background())
	if err != nil {
		return nil, err
	}
	nodes := make([]Node, len(rows))
	for i, row := range rows {
		nodes[i] = fromDB(row)
	}
	return nodes, nil
}

func (s *Service) Get(id string) (*Node, error) {
	row, err := s.queries.GetNode(context.Background(), id)
	if err != nil {
		return nil, err
	}
	node := fromDB(row)
	return &node, nil
}

func fromDB(row db.Node) Node {
	var sysInfo json.RawMessage
	if row.SystemInfo.Valid && row.SystemInfo.String != "" {
		sysInfo = json.RawMessage(row.SystemInfo.String)
	}

	var lastSeen *time.Time
	if row.LastSeenAt.Valid {
		ts := row.LastSeenAt.Time
		lastSeen = &ts
	}

	return Node{
		ID:         row.ID,
		Name:       row.Name,
		Status:     row.Status,
		TokenHash:  row.TokenHash,
		SystemInfo: sysInfo,
		TokenUsed:  row.TokenUsed,
		LastSeenAt: lastSeen,
		CreatedAt:  row.CreatedAt,
	}
}
