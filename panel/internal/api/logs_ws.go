package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	panellog "github.com/bsdock/panel/internal/log"
)

// LogsWSHandler upgrades frontend connections and streams log entries.
type LogsWSHandler struct {
	cfg      *config.Config
	hub      *panellog.Hub
	upgrader websocket.Upgrader
}

// NewLogsWSHandler creates a new LogsWSHandler.
func NewLogsWSHandler(cfg *config.Config, hub *panellog.Hub) *LogsWSHandler {
	return &LogsWSHandler{
		cfg: cfg,
		hub: hub,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

// Register registers the logs WebSocket route.
func (h *LogsWSHandler) Register(r *mux.Router) {
	r.HandleFunc("/ws/logs", h.Handle).Methods("GET")
}

// ServeHTTP implements http.Handler for testing convenience.
func (h *LogsWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.Handle(w, r)
}

type subscribeMessage struct {
	Action string `json:"action"`
	Source string `json:"source"`
}

// Handle validates the JWT token from the query string, upgrades the HTTP
// connection, and streams log entries to the WebSocket.
func (h *LogsWSHandler) Handle(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "token required", http.StatusUnauthorized)
		return
	}

	if _, err := auth.ParseToken(h.cfg.JWT.Secret, token); err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	ws, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("logs ws upgrade error: %v", err)
		return
	}
	defer ws.Close()

	source := panellog.SourceRuntime
	if err := h.sendSnapshot(ws, source); err != nil {
		log.Printf("logs ws send snapshot: %v", err)
		return
	}

	ch := make(chan panellog.Entry, 32)
	unsub := h.hub.Subscribe(source, ch)
	defer unsub()

	switchCh := make(chan panellog.LogSource, 1)
	doneCh := make(chan struct{})

	go func() {
		defer close(doneCh)
		for {
			ws.SetReadDeadline(time.Now().Add(60 * time.Second))
			_, p, err := ws.ReadMessage()
			if err != nil {
				return
			}
			var msg subscribeMessage
			if err := json.Unmarshal(p, &msg); err != nil {
				continue
			}
			if msg.Action != "subscribe" {
				continue
			}
			newSource := panellog.LogSource(msg.Source)
			if newSource != panellog.SourceRuntime && newSource != panellog.SourceRequest {
				continue
			}
			select {
			case switchCh <- newSource:
			default:
			}
		}
	}()

	for {
		select {
		case e := <-ch:
			if err := ws.WriteJSON(e); err != nil {
				return
			}
		case newSource := <-switchCh:
			unsub()
			source = newSource
			ch = make(chan panellog.Entry, 32)
			unsub = h.hub.Subscribe(source, ch)
			if err := h.sendSnapshot(ws, source); err != nil {
				log.Printf("logs ws send snapshot: %v", err)
				return
			}
		case <-doneCh:
			return
		}
	}
}

func (h *LogsWSHandler) sendSnapshot(ws *websocket.Conn, source panellog.LogSource) error {
	snap := h.hub.Snapshot(source)
	if snap == nil {
		snap = []panellog.Entry{}
	}
	return ws.WriteJSON(map[string]interface{}{
		"type":    "snapshot",
		"source":  source,
		"entries": snap,
	})
}
