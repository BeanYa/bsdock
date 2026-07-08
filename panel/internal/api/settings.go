package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	panelacme "github.com/bsdock/panel/internal/acme"
	"github.com/bsdock/panel/internal/config"
	"github.com/gorilla/mux"
)

type SettingsHandler struct {
	cfg        *config.Config
	configPath string
	certDir    string
	issuer     panelacme.Issuer
}

func NewSettingsHandler(cfg *config.Config, configPath, certDir string, issuer panelacme.Issuer) *SettingsHandler {
	if configPath == "" {
		configPath = "./config.yaml"
	}
	if certDir == "" {
		certDir = "cert"
	}
	if issuer == nil {
		issuer = panelacme.NewClient(panelacme.WithCertDir(certDir))
	}
	return &SettingsHandler{cfg: cfg, configPath: configPath, certDir: certDir, issuer: issuer}
}

func (h *SettingsHandler) Register(r *mux.Router) {
	r.HandleFunc("/settings", h.Get).Methods("GET")
	r.HandleFunc("/settings", h.Save).Methods("PUT")
	r.HandleFunc("/settings/acme", h.RequestACME).Methods("POST")
}

type settingsResponse struct {
	Address     string `json:"address"`
	Port        string `json:"port"`
	BaseURI     string `json:"base_uri"`
	Domain      string `json:"domain"`
	PanelURI    string `json:"panel_uri"`
	TLSCertPath string `json:"tls_cert_path"`
	TLSKeyPath  string `json:"tls_key_path"`
	Timezone    string `json:"timezone"`
	RestartHint bool   `json:"restart_hint"`
}

type saveSettingsRequest struct {
	Address     string `json:"address"`
	Port        string `json:"port"`
	BaseURI     string `json:"base_uri"`
	Domain      string `json:"domain"`
	PanelURI    string `json:"panel_uri"`
	TLSCertPath string `json:"tls_cert_path"`
	TLSKeyPath  string `json:"tls_key_path"`
	Timezone    string `json:"timezone"`
}

type acmeRequest struct {
	Domain   string `json:"domain"`
	Email    string `json:"email"`
	HTTPPort string `json:"http_port"`
}

type acmeResponse struct {
	Domain      string `json:"domain"`
	TLSCertPath string `json:"tls_cert_path"`
	TLSKeyPath  string `json:"tls_key_path"`
}

func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, h.response())
}

func (h *SettingsHandler) Save(w http.ResponseWriter, r *http.Request) {
	var req saveSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if err := validateSettingsRequest(req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	h.applySettings(req)
	if err := config.Save(h.configPath, h.cfg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, h.response())
}

func (h *SettingsHandler) RequestACME(w http.ResponseWriter, r *http.Request) {
	var req acmeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	req.Domain = strings.TrimSpace(req.Domain)
	req.Email = strings.TrimSpace(req.Email)
	req.HTTPPort = strings.TrimSpace(req.HTTPPort)
	if req.Domain == "" {
		http.Error(w, "domain required", http.StatusBadRequest)
		return
	}

	result, err := h.issuer.Obtain(r.Context(), panelacme.Request{
		Domain:   req.Domain,
		Email:    req.Email,
		HTTPPort: req.HTTPPort,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	h.cfg.Domain = result.Domain
	h.cfg.TLS.CertPath = result.CertPath
	h.cfg.TLS.KeyPath = result.KeyPath
	if h.cfg.PanelURI == "" && result.Domain != "" {
		h.cfg.PanelURI = buildPanelURI(result.Domain, h.cfg.Port, h.cfg.BaseURI, h.cfg.TLS.CertPath, h.cfg.TLS.KeyPath)
	}
	if err := config.Save(h.configPath, h.cfg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, acmeResponse{Domain: result.Domain, TLSCertPath: result.CertPath, TLSKeyPath: result.KeyPath})
}

func (h *SettingsHandler) response() settingsResponse {
	return settingsResponse{
		Address:     h.cfg.Address,
		Port:        h.cfg.Port,
		BaseURI:     h.cfg.BaseURI,
		Domain:      h.cfg.Domain,
		PanelURI:    h.cfg.PanelURI,
		TLSCertPath: h.cfg.TLS.CertPath,
		TLSKeyPath:  h.cfg.TLS.KeyPath,
		Timezone:    h.cfg.Timezone,
		RestartHint: true,
	}
}

func (h *SettingsHandler) applySettings(req saveSettingsRequest) {
	h.cfg.Address = strings.TrimSpace(req.Address)
	h.cfg.Port = strings.TrimSpace(req.Port)
	h.cfg.BaseURI = normalizeBaseURI(req.BaseURI)
	h.cfg.Domain = strings.TrimSpace(req.Domain)
	h.cfg.PanelURI = strings.TrimSpace(req.PanelURI)
	h.cfg.TLS.CertPath = strings.TrimSpace(req.TLSCertPath)
	h.cfg.TLS.KeyPath = strings.TrimSpace(req.TLSKeyPath)
	h.cfg.Timezone = strings.TrimSpace(req.Timezone)
}

func validateSettingsRequest(req saveSettingsRequest) error {
	port := strings.TrimSpace(req.Port)
	if port == "" {
		return errors.New("port required")
	}
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return errors.New("invalid port")
	}
	if normalizeBaseURI(req.BaseURI) == "" {
		return errors.New("invalid base uri")
	}
	certPath := strings.TrimSpace(req.TLSCertPath)
	keyPath := strings.TrimSpace(req.TLSKeyPath)
	if (certPath == "") != (keyPath == "") {
		return errors.New("certificate and key paths must be set together")
	}
	return nil
}

func normalizeBaseURI(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "/"
	}
	if !strings.HasPrefix(value, "/") {
		value = "/" + value
	}
	if !strings.HasSuffix(value, "/") {
		value += "/"
	}
	return value
}

func buildPanelURI(domain, port, baseURI, certPath, keyPath string) string {
	scheme := "http"
	if certPath != "" && keyPath != "" {
		scheme = "https"
	}
	host := strings.TrimSpace(domain)
	if host == "" {
		host = "localhost"
	}
	if port != "" && !((scheme == "http" && port == "80") || (scheme == "https" && port == "443")) {
		host += ":" + port
	}
	return scheme + "://" + host + filepath.ToSlash(normalizeBaseURI(baseURI))
}
