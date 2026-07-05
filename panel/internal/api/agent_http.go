package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
)

type AgentHTTPHandler struct {
	db      *sql.DB
	queries *db.Queries
	cfg     *config.Config
	svc     *node.Service
	hub     *wshub.Hub
}

func NewAgentHTTPHandler(sqlDB *sql.DB, queries *db.Queries, cfg *config.Config, svc *node.Service, hub *wshub.Hub) *AgentHTTPHandler {
	return &AgentHTTPHandler{db: sqlDB, queries: queries, cfg: cfg, svc: svc, hub: hub}
}

func (h *AgentHTTPHandler) Register(r *mux.Router) {
	r.HandleFunc("/api/v1/agent/report", h.Report).Methods("POST")
	r.HandleFunc("/api/v1/agent/poll", h.Poll).Methods("POST")
}

type agentReportPayload struct {
	Type       string   `json:"type"`
	Token      string   `json:"token"`
	Hostname   string   `json:"hostname"`
	OS         string   `json:"os"`
	Arch       string   `json:"arch"`
	Kernel     string   `json:"kernel"`
	CPUModel   string   `json:"cpu_model"`
	CPUCores   int      `json:"cpu_cores"`
	Memory     int64    `json:"memory_total"`
	DiskTotal  int64    `json:"disk_total"`
	DiskFree   int64    `json:"disk_free"`
	IPs        []string `json:"ips"`
	Uptime     int64    `json:"uptime"`
	CPUPercent float64  `json:"cpu_percent"`
	MemoryUsed int64    `json:"memory_used"`
	MemoryFree int64    `json:"memory_free"`
}

// agentSystemInfo contains the same fields as agentReportPayload minus the
// install token. It is the shape persisted in the nodes.system_info column.
type agentSystemInfo struct {
	Hostname   string   `json:"hostname"`
	OS         string   `json:"os"`
	Arch       string   `json:"arch"`
	Kernel     string   `json:"kernel"`
	CPUModel   string   `json:"cpu_model"`
	CPUCores   int      `json:"cpu_cores"`
	Memory     int64    `json:"memory_total"`
	DiskTotal  int64    `json:"disk_total"`
	DiskFree   int64    `json:"disk_free"`
	IPs        []string `json:"ips"`
	Uptime     int64    `json:"uptime"`
	CPUPercent float64  `json:"cpu_percent"`
	MemoryUsed int64    `json:"memory_used"`
	MemoryFree int64    `json:"memory_free"`
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

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("agent report: begin transaction: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()
	qtx := h.queries.WithTx(tx)

	nodeRow, err := qtx.GetNode(ctx, claims.NodeID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		log.Printf("agent report: get node: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if nodeRow.TokenHash != hashToken(payload.Token) {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	// First report marks token used and activates the node.
	wasTokenUsed := nodeRow.TokenUsed
	if !nodeRow.TokenUsed {
		if err := qtx.MarkInstallTokenUsed(ctx, claims.NodeID); err != nil {
			log.Printf("agent report: mark install token used: %v", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
	}

	// Heartbeats only refresh liveness. Full reports/polls carry system info.
	if payload.Type != "heartbeat" {
		if math.IsNaN(payload.CPUPercent) || math.IsInf(payload.CPUPercent, 0) || payload.CPUPercent < 0 || payload.CPUPercent > 100 {
			payload.CPUPercent = 0
		}
		if payload.MemoryUsed < 0 {
			payload.MemoryUsed = 0
		}
		if payload.MemoryFree < 0 {
			payload.MemoryFree = 0
		}
		info := agentSystemInfo{
			Hostname:   payload.Hostname,
			OS:         payload.OS,
			Arch:       payload.Arch,
			Kernel:     payload.Kernel,
			CPUModel:   payload.CPUModel,
			CPUCores:   payload.CPUCores,
			Memory:     payload.Memory,
			DiskTotal:  payload.DiskTotal,
			DiskFree:   payload.DiskFree,
			IPs:        payload.IPs,
			Uptime:     payload.Uptime,
			CPUPercent: payload.CPUPercent,
			MemoryUsed: payload.MemoryUsed,
			MemoryFree: payload.MemoryFree,
		}
		data, err := json.Marshal(info)
		if err != nil {
			log.Printf("agent report: marshal system info: %v", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}

		if err := qtx.UpdateNodeSystemInfo(ctx, db.UpdateNodeSystemInfoParams{
			SystemInfo: sql.NullString{String: string(data), Valid: true},
			ID:         claims.NodeID,
		}); err != nil {
			log.Printf("agent report: update system info: %v", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
	}
	if err := qtx.UpdateNodeStatus(ctx, db.UpdateNodeStatusParams{Status: "online", ID: claims.NodeID}); err != nil {
		log.Printf("agent report: update status: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("agent report: commit transaction: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	updated, err := h.svc.Get(claims.NodeID)
	if err == nil {
		h.hub.Broadcast(claims.NodeID, map[string]interface{}{
			"type":    "node_update",
			"payload": updated,
		})
	}

	if !wasTokenUsed {
		log.Printf("node %s installed and online via http", claims.NodeID)
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
