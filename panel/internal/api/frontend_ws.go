package api

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	wshub "github.com/bsdock/panel/internal/websocket"
)

// FrontendWSHandler upgrades frontend connections and streams node updates.
type FrontendWSHandler struct {
	hub      *wshub.Hub
	cfg      *config.Config
	upgrader websocket.Upgrader
}

// NewFrontendWSHandler creates a new FrontendWSHandler.
func NewFrontendWSHandler(hub *wshub.Hub, cfg *config.Config) *FrontendWSHandler {
	return &FrontendWSHandler{
		hub: hub,
		cfg: cfg,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

// Register registers the frontend WebSocket route.
func (h *FrontendWSHandler) Register(r *mux.Router) {
	r.HandleFunc("/ws", h.Handle).Methods("GET")
}

// Handle validates the JWT token from the query string, upgrades the HTTP
// connection, and writes hub messages to the WebSocket.
func (h *FrontendWSHandler) Handle(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "token required", http.StatusUnauthorized)
		return
	}

	claims, err := auth.ParseToken(h.cfg.JWT.Secret, token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	nodeID := r.URL.Query().Get("node_id")
	if nodeID == "" {
		http.Error(w, "node_id required", http.StatusBadRequest)
		return
	}

	r = r.WithContext(context.WithValue(r.Context(), ContextUsername, claims.Username))

	ws, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer ws.Close()

	ch := make(chan []byte, 16)
	h.hub.Subscribe(nodeID, ch)
	defer h.hub.Unsubscribe(nodeID, ch)

	for msg := range ch {
		if err := ws.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
}
