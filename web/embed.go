package web

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:dist
var staticFS embed.FS

// StaticHandler returns an http.Handler that serves the embedded frontend
// build output from dist/.
func StaticHandler() (http.Handler, error) {
	fsys, err := fs.Sub(staticFS, "dist")
	if err != nil {
		return nil, err
	}
	return http.FileServer(http.FS(fsys)), nil
}
