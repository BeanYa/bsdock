package api

import (
	"encoding/json"
	"net/http"
)

// respondJSON marshals v as JSON and writes it to w with a 200 status.
// This helper is defined here temporarily for Task 6; Task 9 will expand
// or relocate it as the api package grows.
func respondJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
