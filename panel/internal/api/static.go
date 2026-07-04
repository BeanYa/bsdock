package api

import (
	"net/http"

	"github.com/bsdock/web"
)

// StaticHandler returns an http.Handler that serves embedded static files
// from the frontend build output (web/dist).
func StaticHandler() (http.Handler, error) {
	return web.StaticHandler()
}
