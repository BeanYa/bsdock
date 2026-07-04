package api

import (
	"encoding/json"
	"fmt"
	"net/http"

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
	Name string `json:"name"`
}

type createNodeResponse struct {
	Node           node.Node `json:"node"`
	InstallCommand string    `json:"install_command"`
}

func (h *NodesHandler) Register(r *mux.Router) {
	r.HandleFunc("/api/v1/nodes", h.Create).Methods("POST")
	r.HandleFunc("/api/v1/nodes", h.List).Methods("GET")
	r.HandleFunc("/api/v1/nodes/{id}", h.Get).Methods("GET")
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

	n, token, err := h.svc.Create(r.Context(), req.Name, panelURL, h.cfg.JWT.Secret, h.cfg.JWT.ExpireHours)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := fmt.Sprintf("bash <(curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/scripts/install-agent.sh) --panel %s --token %s", panelURL, token)

	respondJSON(w, createNodeResponse{Node: *n, InstallCommand: cmd})
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
