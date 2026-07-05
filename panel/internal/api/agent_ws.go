package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"math"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
)

type AgentWSHandler struct {
	svc      *node.Service
	queries  *db.Queries
	cfg      *config.Config
	hub      *wshub.Hub
	upgrader websocket.Upgrader
}

func NewAgentWSHandler(svc *node.Service, queries *db.Queries, cfg *config.Config, hub *wshub.Hub) *AgentWSHandler {
	return &AgentWSHandler{
		svc:     svc,
		queries: queries,
		cfg:     cfg,
		hub:     hub,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *AgentWSHandler) Register(r *mux.Router) {
	r.HandleFunc("/api/v1/agent/ws", h.Handle).Methods("GET")
}

func (h *AgentWSHandler) Handle(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	claims, err := auth.ParseInstallToken(h.cfg.JWT.Secret, token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	nodeRow, err := h.queries.GetNode(r.Context(), claims.NodeID)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	if nodeRow.TokenHash != hashToken(token) {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	if nodeRow.TokenUsed {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	ws, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer ws.Close()

	if err := h.queries.MarkInstallTokenUsed(r.Context(), claims.NodeID); err != nil {
		ws.Close()
		return
	}
	if err := h.queries.UpdateNodeStatus(r.Context(), db.UpdateNodeStatusParams{Status: "online", ID: claims.NodeID}); err != nil {
		ws.Close()
		return
	}

	log.Printf("node %s installed and online via websocket", claims.NodeID)
	h.broadcastNodeUpdate(claims.NodeID)

	for {
		var msg map[string]interface{}
		if err := ws.ReadJSON(&msg); err != nil {
			break
		}
		t, _ := msg["type"].(string)
		switch t {
		case "register":
			h.handleRegister(claims.NodeID, msg)
		case "metrics":
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			if err := h.updateMetrics(ctx, claims.NodeID, msg); err != nil {
				log.Printf("agent ws metrics update error: %v", err)
			}
			cancel()
			if err := h.queries.UpdateNodeStatus(r.Context(), db.UpdateNodeStatusParams{Status: "online", ID: claims.NodeID}); err != nil {
				log.Printf("agent ws status update error: %v", err)
			}
			h.broadcastNodeUpdate(claims.NodeID)
		case "heartbeat":
			h.queries.UpdateNodeStatus(r.Context(), db.UpdateNodeStatusParams{Status: "online", ID: claims.NodeID})
		}
	}
}

func (h *AgentWSHandler) handleRegister(nodeID string, msg map[string]interface{}) {
	payload, ok := msg["payload"].(map[string]interface{})
	if !ok {
		return
	}
	data, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	h.queries.UpdateNodeSystemInfo(ctx, db.UpdateNodeSystemInfoParams{
		SystemInfo: sql.NullString{String: string(data), Valid: true},
		ID:         nodeID,
	})
	h.broadcastNodeUpdate(nodeID)
}

func (h *AgentWSHandler) updateMetrics(ctx context.Context, nodeID string, msg map[string]interface{}) error {
	nodeRow, err := h.queries.GetNode(ctx, nodeID)
	if err != nil {
		return err
	}
	var info map[string]interface{}
	if nodeRow.SystemInfo.Valid && nodeRow.SystemInfo.String != "" {
		if err := json.Unmarshal([]byte(nodeRow.SystemInfo.String), &info); err != nil {
			log.Printf("agent ws metrics: unmarshal system_info for node %s: %v", nodeID, err)
			info = make(map[string]interface{})
		}
	}
	if info == nil {
		info = make(map[string]interface{})
	}
	if v, ok := msg["cpu_percent"]; ok {
		if f, ok := toFloat64(v); ok && !math.IsNaN(f) && !math.IsInf(f, 0) && f >= 0 && f <= 100 {
			info["cpu_percent"] = f
		} else {
			info["cpu_percent"] = float64(0)
		}
	}
	if v, ok := msg["memory_used"]; ok {
		if f, ok := toFloat64(v); ok && f >= 0 {
			info["memory_used"] = f
		} else {
			info["memory_used"] = float64(0)
		}
	}
	if v, ok := msg["memory_free"]; ok {
		if f, ok := toFloat64(v); ok && f >= 0 {
			info["memory_free"] = f
		} else {
			info["memory_free"] = float64(0)
		}
	}
	data, err := json.Marshal(info)
	if err != nil {
		return err
	}
	return h.queries.UpdateNodeSystemInfo(ctx, db.UpdateNodeSystemInfoParams{
		SystemInfo: sql.NullString{String: string(data), Valid: true},
		ID:         nodeID,
	})
}

func toFloat64(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case int32:
		return float64(n), true
	}
	return 0, false
}

func (h *AgentWSHandler) broadcastNodeUpdate(nodeID string) {
	n, err := h.svc.Get(nodeID)
	if err != nil {
		return
	}
	h.hub.Broadcast(nodeID, map[string]interface{}{
		"type":    "node_update",
		"payload": n,
	})
}
