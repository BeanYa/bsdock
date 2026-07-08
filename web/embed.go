package web

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
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
	files := http.FileServer(http.FS(fsys))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestPath := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if requestPath == "" {
			requestPath = "index.html"
		}
		if _, err := fs.Stat(fsys, requestPath); err == nil {
			files.ServeHTTP(w, r)
			return
		}
		if r.Method == http.MethodGet || r.Method == http.MethodHead {
			http.ServeFileFS(w, r, fsys, "index.html")
			return
		}
		http.NotFound(w, r)
	}), nil
}
