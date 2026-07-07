package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

// FrontendEventHandler records lightweight UI events from the SPA.
type FrontendEventHandler struct{}

// NewFrontendEventHandler creates a FrontendEventHandler.
func NewFrontendEventHandler() *FrontendEventHandler {
	return &FrontendEventHandler{}
}

// Register adds frontend event routes.
func (h *FrontendEventHandler) Register(r *mux.Router) {
	r.HandleFunc("/events/page-view", h.PageView).Methods("POST")
}

type pageViewRequest struct {
	Path     string `json:"path"`
	Title    string `json:"title"`
	Referrer string `json:"referrer"`
}

// PageView logs SPA route changes into the runtime log stream.
func (h *FrontendEventHandler) PageView(w http.ResponseWriter, r *http.Request) {
	var req pageViewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	req.Path = strings.TrimSpace(req.Path)
	if req.Path == "" || !strings.HasPrefix(req.Path, "/") {
		http.Error(w, "path required", http.StatusBadRequest)
		return
	}

	log.Printf(
		"frontend page_view path=%s title=%s referrer=%s %s",
		quoteLogValue(req.Path),
		quoteLogValue(req.Title),
		quoteLogValue(req.Referrer),
		requestSourceFields(r),
	)
	w.WriteHeader(http.StatusNoContent)
}
