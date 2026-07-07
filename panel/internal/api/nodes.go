package api

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
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
	r.HandleFunc("/nodes/{id}/reset", h.Reset).Methods("POST")
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

	panelURL := panelURLFromRequest(r)

	platform := strings.ToLower(req.Platform)
	if platform != "windows" {
		platform = "linux"
	}

	n, token, err := h.svc.Create(r.Context(), req.Name, platform, h.cfg.JWT.Secret, 0)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := buildInstallCommand(n.Platform, panelURL, n.ID, token)

	respondJSON(w, createNodeResponse{Node: *n, InstallCommand: cmd})
}

const githubRawBase = "https://raw.githubusercontent.com/BeanYa/bsdock/main"

func buildInstallCommand(platform, panelURL, nodeID, token string) string {
	instanceID := installInstanceID(panelURL, nodeID)
	switch platform {
	case "windows":
		return fmt.Sprintf(
			`powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%s/scripts/install-agent.ps1' -OutFile 'bsdock-install.ps1' -UseBasicParsing; .\bsdock-install.ps1 -PanelURL '%s' -Token '%s' -InstanceID '%s'"`,
			githubRawBase, panelURL, token, instanceID,
		)
	default:
		return fmt.Sprintf("bash <(curl -fsSL %s/scripts/install-agent.sh) --panel %s --token %s --instance-id %s", githubRawBase, panelURL, token, instanceID)
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

	panelURL := panelURLFromRequest(r)

	n, token, err := h.svc.RotateToken(r.Context(), vars["id"], h.cfg.JWT.Secret, 0)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "node not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := buildInstallCommand(n.Platform, panelURL, n.ID, token)
	respondJSON(w, rotateTokenResponse{InstallCommand: cmd})
}

func (h *NodesHandler) Reset(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	panelURL := panelURLFromRequest(r)

	n, token, err := h.svc.Reset(r.Context(), vars["id"], h.cfg.JWT.Secret, 0)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "node not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cmd := buildInstallCommand(n.Platform, panelURL, n.ID, token)
	respondJSON(w, rotateTokenResponse{InstallCommand: cmd})
}

func panelURLFromRequest(r *http.Request) string {
	if panelURL := strings.TrimSpace(r.Header.Get("X-Panel-URL")); panelURL != "" {
		return panelURL
	}

	proto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto"))
	if proto == "" {
		switch {
		case r.URL.Scheme != "":
			proto = r.URL.Scheme
		case r.TLS != nil:
			proto = "https"
		default:
			proto = "http"
		}
	}

	host := r.Host
	if host == "" {
		host = r.URL.Host
	}
	if host == "" {
		host = "localhost"
	}
	return proto + "://" + host
}

func installInstanceID(panelURL, nodeID string) string {
	normalized := normalizePanelURL(panelURL)
	sum := sha256.Sum256([]byte(normalized + ":" + nodeID))
	return hex.EncodeToString(sum[:])[:16]
}

func normalizePanelURL(panelURL string) string {
	u, err := url.Parse(strings.TrimSpace(panelURL))
	if err != nil {
		return strings.TrimRight(strings.TrimSpace(panelURL), "/")
	}
	u.Scheme = strings.ToLower(u.Scheme)
	host := strings.ToLower(u.Hostname())
	port := u.Port()
	if port != "" && !((u.Scheme == "http" && port == "80") || (u.Scheme == "https" && port == "443")) {
		host = net.JoinHostPort(host, port)
	}
	u.Host = host
	u.Path = strings.TrimRight(u.Path, "/")
	return strings.TrimRight(u.String(), "/")
}
