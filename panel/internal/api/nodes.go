package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/node"
)

type NodesHandler struct {
	svc *node.Service
	cfg *config.Config
}

func NewNodesHandler(svc *node.Service, cfg *config.Config) *NodesHandler {
	return &NodesHandler{svc: svc, cfg: cfg}
}

type createNodeRequest struct {
	Name     string `json:"name"`
	Platform string `json:"platform"`
}

type createNodeResponse struct {
	Node           node.Node `json:"node"`
	InstallCommand string    `json:"install_command"`
}

func (h *NodesHandler) Register(r *mux.Router) {
	r.HandleFunc("/nodes", h.Create).Methods("POST")
	r.HandleFunc("/nodes", h.List).Methods("GET")
	r.HandleFunc("/nodes/{id}", h.Get).Methods("GET")
	r.HandleFunc("/nodes/{id}/rotate-token", h.RotateToken).Methods("POST")
}

type rotateTokenResponse struct {
	InstallCommand string `json:"install_command"`
}

func (h *NodesHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "name required", http.StatusBadRequest)
		return
	}

	panelURL := r.Header.Get("X-Panel-URL")
	if panelURL == "" {
		panelURL = "https://panel.example.com"
	}

	platform := strings.ToLower(req.Platform)
	if platform != "windows" {
		platform = "linux"
	}

	n, token, err := h.svc.Create(r.Context(), req.Name, platform, h.cfg.JWT.Secret, h.cfg.JWT.ExpireHours)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := buildInstallCommand(n.Platform, panelURL, token)

	respondJSON(w, createNodeResponse{Node: *n, InstallCommand: cmd})
}

const githubRawBase = "https://raw.githubusercontent.com/BeanYa/bsdock/main"

func buildInstallCommand(platform, panelURL, token string) string {
	switch platform {
	case "windows":
		return fmt.Sprintf(
			`powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%s/scripts/install-agent.ps1' -OutFile 'bsdock-install.ps1' -UseBasicParsing; .\bsdock-install.ps1 -PanelURL '%s' -Token '%s'"`,
			githubRawBase, panelURL, token,
		)
	default:
		return fmt.Sprintf("bash <(curl -fsSL %s/scripts/install-agent.sh) --panel %s --token %s", githubRawBase, panelURL, token)
	}
}

func (h *NodesHandler) List(w http.ResponseWriter, r *http.Request) {
	nodes, err := h.svc.List()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, nodes)
}

func (h *NodesHandler) Get(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	n, err := h.svc.Get(vars["id"])
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	respondJSON(w, n)
}

func (h *NodesHandler) RotateToken(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	panelURL := r.Header.Get("X-Panel-URL")
	if panelURL == "" {
		panelURL = "https://panel.example.com"
	}

	n, token, err := h.svc.RotateToken(r.Context(), vars["id"], h.cfg.JWT.Secret, h.cfg.JWT.ExpireHours)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "node not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := buildInstallCommand(n.Platform, panelURL, token)
	respondJSON(w, rotateTokenResponse{InstallCommand: cmd})
}
