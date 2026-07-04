package transport

import (
	"context"
	"net/url"
	"time"

	"github.com/gorilla/websocket"

	"github.com/bsdock/agent/internal/collector"
)

func (c *Client) runWebSocket(ctx context.Context, info *collector.SystemInfo) error {
	scheme := "wss"
	if c.cfg.Insecure {
		scheme = "ws"
	}
	u, err := url.Parse(c.cfg.PanelURL)
	if err != nil {
		return err
	}
	u.Scheme = scheme
	u.Path = "/api/v1/agent/ws"
	q := u.Query()
	q.Set("token", c.cfg.Token)
	u.RawQuery = q.Encode()

	ws, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return err
	}
	defer ws.Close()

	if err := ws.WriteJSON(c.buildPayload(info)); err != nil {
		return err
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := ws.WriteJSON(c.buildHeartbeat()); err != nil {
				return err
			}
		}
	}
}
