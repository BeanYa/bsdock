package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
)

// respondJSON marshals v as JSON and writes it to w with a JSON content type.
// Encoding errors are logged; headers may already be written so we cannot
// send an HTTP error response at that point.
func respondJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("respondJSON: encode error: %v", err)
	}
}

type contextKey string

// ContextUsername is the context key used to store the authenticated username.
const ContextUsername contextKey = "username"

// AuthMiddleware enforces JWT authentication for API routes while allowing
// public paths such as login and agent endpoints.
func AuthMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow public paths
			if strings.HasPrefix(r.URL.Path, "/api/v1/login") ||
				strings.HasPrefix(r.URL.Path, "/api/v1/agent/") {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := auth.ParseToken(cfg.JWT.Secret, parts[1])
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			r = r.WithContext(context.WithValue(r.Context(), ContextUsername, claims.Username))
			next.ServeHTTP(w, r)
		})
	}
}
