package api

import (
	"context"
	"database/sql"
	"errors"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/db"
)

var errInvalidAgentToken = errors.New("invalid agent token")

type agentNodeGetter interface {
	GetNode(ctx context.Context, id string) (db.Node, error)
}

func authenticateAgentToken(ctx context.Context, q agentNodeGetter, secret, token string) (*auth.InstallClaims, db.Node, error) {
	claims, err := auth.ParseInstallToken(secret, token)
	if err != nil {
		return nil, db.Node{}, errInvalidAgentToken
	}

	nodeRow, err := q.GetNode(ctx, claims.NodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, db.Node{}, errInvalidAgentToken
		}
		return nil, db.Node{}, err
	}
	if nodeRow.TokenHash != hashToken(token) {
		return nil, db.Node{}, errInvalidAgentToken
	}

	return claims, nodeRow, nil
}
