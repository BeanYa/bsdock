// Package mux provides a minimal HTTP request router used as a local fallback
// when github.com/gorilla/mux cannot be fetched from the network.
// It implements only the subset of the gorilla/mux API required by the panel.
package mux

import (
	"context"
	"net/http"
	"strings"
)

// NewRouter returns a new router instance.
func NewRouter() *Router {
	return &Router{}
}

// Router registers routes to be matched and dispatches a handler.
type Router struct {
	routes []*Route
}

// HandleFunc registers a new route with a matcher for the URL path.
func (r *Router) HandleFunc(path string, f func(http.ResponseWriter, *http.Request)) *Route {
	route := &Route{
		router:  r,
		path:    path,
		handler: http.HandlerFunc(f),
	}
	r.routes = append(r.routes, route)
	return route
}

// ServeHTTP dispatches the handler registered in the matched route.
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	for _, route := range r.routes {
		if len(route.methods) > 0 {
			found := false
			for _, m := range route.methods {
				if m == req.Method {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		vars, ok := matchPath(route.path, req.URL.Path)
		if ok {
			ctx := context.WithValue(req.Context(), varsKey, vars)
			req = req.WithContext(ctx)
			route.handler.ServeHTTP(w, req)
			return
		}
	}
	http.NotFound(w, req)
}

// Route stores information to match a request.
type Route struct {
	router  *Router
	path    string
	methods []string
	handler http.Handler
}

// Methods adds a matcher for HTTP methods.
func (r *Route) Methods(methods ...string) *Route {
	for i := range methods {
		methods[i] = strings.ToUpper(methods[i])
	}
	r.methods = methods
	return r
}

type contextKey int

const varsKey contextKey = 0

// Vars returns the route variables for the current request, if any.
func Vars(r *http.Request) map[string]string {
	if v := r.Context().Value(varsKey); v != nil {
		return v.(map[string]string)
	}
	return nil
}

func matchPath(pattern, path string) (map[string]string, bool) {
	pp := strings.Split(pattern, "/")
	ps := strings.Split(path, "/")
	if len(pp) != len(ps) {
		return nil, false
	}
	vars := make(map[string]string)
	for i := range pp {
		if len(pp[i]) > 2 && strings.HasPrefix(pp[i], "{") && strings.HasSuffix(pp[i], "}") {
			name := pp[i][1 : len(pp[i])-1]
			vars[name] = ps[i]
		} else if pp[i] != ps[i] {
			return nil, false
		}
	}
	return vars, true
}
