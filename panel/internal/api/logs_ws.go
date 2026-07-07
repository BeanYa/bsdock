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
	cfg          *config.Config
	hub          *panellog.Hub
	upgrader     websocket.Upgrader
	readTimeout  time.Duration
	pingInterval time.Duration
}

const (
	defaultLogsWSReadTimeout  = 60 * time.Second
	defaultLogsWSPingInterval = 25 * time.Second
)

// NewLogsWSHandler creates a new LogsWSHandler.
func NewLogsWSHandler(cfg *config.Config, hub *panellog.Hub) *LogsWSHandler {
	return &LogsWSHandler{
		cfg:          cfg,
		hub:          hub,
		readTimeout:  defaultLogsWSReadTimeout,
		pingInterval: defaultLogsWSPingInterval,
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

	source := logSourceFromRequest(r)
	if h.readTimeout > 0 {
		if err := ws.SetReadDeadline(time.Now().Add(h.readTimeout)); err != nil {
			log.Printf("logs ws set read deadline: %v", err)
			return
		}
		ws.SetPongHandler(func(string) error {
			return ws.SetReadDeadline(time.Now().Add(h.readTimeout))
		})
	}
	if err := h.sendSnapshot(ws, source); err != nil {
		log.Printf("logs ws send snapshot: %v", err)
		return
	}

	ch := make(chan panellog.Entry, 32)
	unsub := h.hub.Subscribe(source, ch)
	defer unsub()

	switchCh := make(chan panellog.LogSource, 1)
	doneCh := make(chan struct{})
	var pingTicker *time.Ticker
	if h.pingInterval > 0 {
		pingTicker = time.NewTicker(h.pingInterval)
		defer pingTicker.Stop()
	}
	var pingC <-chan time.Time
	if pingTicker != nil {
		pingC = pingTicker.C
	}

	go func() {
		defer close(doneCh)
		for {
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
		case <-pingC:
			if err := ws.WriteControl(websocket.PingMessage, nil, time.Now().Add(5*time.Second)); err != nil {
				return
			}
		case <-doneCh:
			return
		}
	}
}

func logSourceFromRequest(r *http.Request) panellog.LogSource {
	source := panellog.LogSource(r.URL.Query().Get("source"))
	if source == panellog.SourceRequest {
		return panellog.SourceRequest
	}
	return panellog.SourceRuntime
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
