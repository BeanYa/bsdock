package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
)

type AgentHTTPHandler struct {
	svc     *node.Service
	queries *db.Queries
	cfg     *config.Config
}

func NewAgentHTTPHandler(svc *node.Service, queries *db.Queries, cfg *config.Config) *AgentHTTPHandler {
	return &AgentHTTPHandler{svc: svc, queries: queries, cfg: cfg}
}

func (h *AgentHTTPHandler) Register(r *mux.Router) {
	r.HandleFunc("/api/v1/agent/report", h.Report).Methods("POST")
	r.HandleFunc("/api/v1/agent/poll", h.Poll).Methods("POST")
}

type agentReportPayload struct {
	Token     string   `json:"token"`
	Hostname  string   `json:"hostname"`
	OS        string   `json:"os"`
	Arch      string   `json:"arch"`
	Kernel    string   `json:"kernel"`
	CPUModel  string   `json:"cpu_model"`
	CPUCores  int      `json:"cpu_cores"`
	Memory    int64    `json:"memory_total"`
	DiskTotal int64    `json:"disk_total"`
	DiskFree  int64    `json:"disk_free"`
	IPs       []string `json:"ips"`
	Uptime    int64    `json:"uptime"`
}

func (h *AgentHTTPHandler) Report(w http.ResponseWriter, r *http.Request) {
	h.handle(w, r, false)
}

func (h *AgentHTTPHandler) Poll(w http.ResponseWriter, r *http.Request) {
	h.handle(w, r, true)
}

func (h *AgentHTTPHandler) handle(w http.ResponseWriter, r *http.Request, isPoll bool) {
	var payload agentReportPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	claims, err := auth.ParseInstallToken(h.cfg.JWT.Secret, payload.Token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	nodeRow, err := h.queries.GetNode(r.Context(), claims.NodeID)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// First report marks token used and activates node
	if !nodeRow.TokenUsed {
		if err := h.queries.MarkInstallTokenUsed(ctx, claims.NodeID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	data, _ := json.Marshal(payload)
	if err := h.queries.UpdateNodeSystemInfo(ctx, db.UpdateNodeSystemInfoParams{
		SystemInfo: sql.NullString{String: string(data), Valid: true},
		ID:         claims.NodeID,
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := h.queries.UpdateNodeStatus(ctx, db.UpdateNodeStatusParams{Status: "online", ID: claims.NodeID}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	next := 30
	if isPoll {
		next = 10
	}
	respondJSON(w, map[string]interface{}{
		"type":                "ack",
		"node_id":             claims.NodeID,
		"status":              "online",
		"next_report_seconds": next,
	})
}
