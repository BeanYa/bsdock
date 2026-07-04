package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
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
	if err != nil || nodeRow.TokenUsed {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	if nodeRow.TokenHash != hashToken(token) {
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
