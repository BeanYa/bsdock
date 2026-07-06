package api

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

	panellog "github.com/bsdock/panel/internal/log"
)

// responseRecorder captures the HTTP status code and response bytes written
// so the request logging middleware can record them.
type responseRecorder struct {
	http.ResponseWriter
	status int
	bytes  int64
}

func (r *responseRecorder) WriteHeader(code int) {
	if r.status == 0 {
		r.status = code
	}
	r.ResponseWriter.WriteHeader(code)
}

func (r *responseRecorder) Write(p []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(p)
	r.bytes += int64(n)
	return n, err
}

// Hijack delegates to the underlying ResponseWriter if it implements
// http.Hijacker. This is required for WebSocket upgrades to work through
// the request logging middleware.
func (r *responseRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := r.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("response does not implement http.Hijacker")
	}
	return h.Hijack()
}

// Flush delegates to the underlying ResponseWriter if it implements
// http.Flusher. This allows streaming responses to work correctly.
func (r *responseRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// RequestLoggingMiddleware returns an HTTP middleware that logs each request
// and response using the provided logger and log hub.
func RequestLoggingMiddleware(logger *log.Logger, logHub *panellog.Hub) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rr := &responseRecorder{ResponseWriter: w}
			next.ServeHTTP(rr, r)
			line := fmt.Sprintf("%s %s %s %d %d %s", r.Method, r.URL.RequestURI(), r.RemoteAddr, rr.status, rr.bytes, time.Since(start))
			logger.Println(line)
			logHub.Write(panellog.SourceRequest, []byte(line))
		})
	}
}
