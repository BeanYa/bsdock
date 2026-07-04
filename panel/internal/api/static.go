package api

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:static
var staticFS embed.FS

// StaticHandler returns an http.Handler that serves embedded static files.
func StaticHandler() (http.Handler, error) {
	fsys, err := fs.Sub(staticFS, "static")
	if err != nil {
		return nil, err
	}
	return http.FileServer(http.FS(fsys)), nil
}
