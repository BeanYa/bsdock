package api

import (
	"context"
	"log"
	"time"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
)

// StartHeartbeatMonitor runs a background goroutine that marks nodes offline
// when their last_seen_at timestamp exceeds the configured heartbeat timeout.
func StartHeartbeatMonitor(svc *node.Service, queries *db.Queries, hub *wshub.Hub, cfg config.Agent) {
	if cfg.HeartbeatTimeoutSeconds <= 0 {
		return
	}

	timeout := time.Duration(cfg.HeartbeatTimeoutSeconds) * time.Second
	tick := timeout / 2
	if tick < 10*time.Second {
		tick = 10 * time.Second
	}

	go func() {
		ticker := time.NewTicker(tick)
		defer ticker.Stop()

		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			// Format the threshold as a SQLite-recognized datetime string without
			// the monotonic reading that Go time.Time carries; otherwise SQLite's
			// datetime() function cannot parse the bound parameter.
			threshold := time.Now().Add(-timeout).UTC().Format("2006-01-02 15:04:05")
			rows, err := queries.ListStaleOnlineNodes(ctx, threshold)
			cancel()
			if err != nil {
				log.Printf("heartbeat monitor: list stale nodes: %v", err)
				continue
			}

			for _, row := range rows {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				if err := queries.MarkNodeOffline(ctx, row.ID); err != nil {
					log.Printf("heartbeat monitor: mark node %s offline: %v", row.ID, err)
					cancel()
					continue
				}
				cancel()

				updated, err := svc.Get(row.ID)
				if err != nil {
					continue
				}
				hub.Broadcast(row.ID, map[string]interface{}{
					"type":    "node_update",
					"payload": updated,
				})
			}
		}
	}()
}
