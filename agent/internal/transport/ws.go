package transport

import (
	"context"
	"log"
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
		log.Printf("agent websocket dial error: %v", err)
		return err
	}
	defer ws.Close()

	if err := ws.WriteJSON(c.buildPayload(info)); err != nil {
		log.Printf("agent websocket register error: %v", err)
		return err
	}
	log.Printf("agent connected to panel via websocket: %s", c.cfg.PanelURL)

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("agent websocket disconnecting: %v", ctx.Err())
			return ctx.Err()
		case <-ticker.C:
			if err := ws.WriteJSON(c.buildHeartbeat()); err != nil {
				log.Printf("agent websocket heartbeat error: %v", err)
				return err
			}
			log.Printf("agent heartbeat sent via websocket")
		}
	}
}
