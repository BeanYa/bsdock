package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
)

// AuthHandler handles authentication requests.
type AuthHandler struct {
	queries *db.Queries
	cfg     *config.Config
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(queries *db.Queries, cfg *config.Config) *AuthHandler {
	return &AuthHandler{queries: queries, cfg: cfg}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string `json:"token"`
}

// Login authenticates a user and returns a JWT token.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	user, err := h.queries.GetUserByUsername(r.Context(), req.Username)
	if err != nil {
		log.Printf("auth login failed username=%s reason=%s %s", quoteLogValue(req.Username), quoteLogValue("unknown_user"), requestSourceFields(r))
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		log.Printf("auth login failed username=%s reason=%s %s", quoteLogValue(req.Username), quoteLogValue("bad_password"), requestSourceFields(r))
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateToken(h.cfg.JWT.Secret, user.Username, h.cfg.JWT.ExpireHours)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("auth login success username=%s %s", quoteLogValue(user.Username), requestSourceFields(r))
	respondJSON(w, loginResponse{Token: token})
}
