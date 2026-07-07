package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/api"
	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	panellog "github.com/bsdock/panel/internal/log"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
	rotlog "github.com/bsdock/pkg/rotlog"
)

// resolveAgentBinDir finds the directory containing agent binaries.
// It supports both the built binary layout (<project>/dist/panel) and
// the dev layout when running via `go run` from the panel/ subdirectory.
func resolveAgentBinDir() string {
	// Built binary layout: executable is at <project>/dist/panel.
	if exe, err := os.Executable(); err == nil {
		binDir := filepath.Join(filepath.Dir(exe), "..", "dist")
		if info, err := os.Stat(binDir); err == nil && info.IsDir() {
			return binDir
		}
	}

	// Dev layout: this file is panel/cmd/panel/main.go, so project root is three levels up.
	if _, file, _, ok := runtime.Caller(0); ok {
		binDir := filepath.Join(filepath.Dir(file), "..", "..", "..", "dist")
		if info, err := os.Stat(binDir); err == nil && info.IsDir() {
			return binDir
		}
	}

	return "dist"
}

func main() {
	logCloser, requestLogger, runtimeWriter, err := setupLogging()
	if err != nil {
		fmt.Fprintf(os.Stderr, "warning: falling back to stderr logging: %v\n", err)
		requestLogger = log.New(os.Stderr, "[request] ", log.LstdFlags)
	} else {
		defer logCloser.Close()
	}
	log.Printf("panel starting")

	logHub := panellog.NewHub()
	if runtimeWriter != nil {
		log.SetOutput(io.MultiWriter(runtimeWriter, &sourceWriter{hub: logHub, source: panellog.SourceRuntime}))
	} else {
		log.SetOutput(&sourceWriter{hub: logHub, source: panellog.SourceRuntime})
	}
	log.Printf("panel runtime logging initialized")

	cfg, err := config.Load("")
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	log.Printf("panel config loaded port=%s database=%q", cfg.Port, cfg.Database.Path)

	startTime := time.Now()

	sqlDB, err := db.Open(cfg.Database.Path)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer sqlDB.Close()
	queries := db.New(sqlDB)

	// Bootstrap admin user
	if cfg.Admin.Username != "" && cfg.Admin.Password != "" {
		_, err := queries.GetUserByUsername(context.Background(), cfg.Admin.Username)
		if err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				log.Fatalf("bootstrap admin: check existing user: %v", err)
			}
			hash, err := auth.HashPassword(cfg.Admin.Password)
			if err != nil {
				log.Fatalf("bootstrap admin: hash password: %v", err)
			}
			if _, err := queries.CreateUser(context.Background(), db.CreateUserParams{
				Username:     cfg.Admin.Username,
				PasswordHash: hash,
			}); err != nil {
				log.Fatalf("bootstrap admin: create user: %v", err)
			}
			log.Printf("bootstrap admin user %q created", cfg.Admin.Username)
		}
	}

	nodeSvc := node.NewService(queries)
	hub := wshub.NewHub()
	go hub.Run()
	api.StartHeartbeatMonitor(nodeSvc, queries, hub, cfg.Agent)

	r := mux.NewRouter()
	r.Use(api.RequestLoggingMiddleware(requestLogger, logHub))

	// Agent endpoints (public)
	agentWS := api.NewAgentWSHandler(nodeSvc, queries, cfg, hub)
	agentWS.Register(r)
	agentHTTP := api.NewAgentHTTPHandler(sqlDB, queries, cfg, nodeSvc, hub)
	agentHTTP.Register(r)

	// Frontend WebSocket for real-time updates (public path; token validated in handler)
	frontendWS := api.NewFrontendWSHandler(hub, cfg)
	frontendWS.Register(r)

	// Logs WebSocket for streaming runtime/request logs
	logsWS := api.NewLogsWSHandler(cfg, logHub)
	logsWS.Register(r)

	// API routes with auth
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	apiRouter.Use(api.AuthMiddleware(cfg))
	authHandler := api.NewAuthHandler(queries, cfg)
	apiRouter.HandleFunc("/login", authHandler.Login).Methods("POST")

	nodesHandler := api.NewNodesHandler(nodeSvc, cfg)
	nodesHandler.Register(apiRouter)

	panelStatusHandler := api.NewPanelStatusHandler(nodeSvc, cfg, hub, startTime)
	panelStatusHandler.Register(apiRouter)

	frontendEventHandler := api.NewFrontendEventHandler()
	frontendEventHandler.Register(apiRouter)

	// Install scripts (no auth)
	r.HandleFunc("/install-agent.sh", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "scripts/install-agent.sh")
	}).Methods("GET")
	r.HandleFunc("/install-agent.ps1", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "scripts/install-agent.ps1")
	}).Methods("GET")

	// Agent binaries (no auth)
	agentBinDir := resolveAgentBinDir()
	r.PathPrefix("/static/agent/").Handler(http.StripPrefix("/static/agent/", http.FileServer(http.Dir(agentBinDir))))

	// Static files (no auth)
	static, err := api.StaticHandler()
	if err != nil {
		log.Fatalf("static handler: %v", err)
	}
	r.PathPrefix("/").Handler(static)
	log.Printf("panel routes registered request_logging=true frontend_ws=true logs_ws=true page_events=true")

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("panel listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Printf("panel shutting down")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}
	log.Printf("panel stopped")
}

func setupLogging() (io.Closer, *log.Logger, *rotlog.RotatingFileWriter, error) {
	exe, err := os.Executable()
	if err != nil {
		return nil, nil, nil, fmt.Errorf("determine executable path: %w", err)
	}
	logDir := filepath.Dir(exe)

	runtimePath := filepath.Join(logDir, "panel.log")
	runtimeWriter, err := rotlog.NewRotatingFileWriter(runtimePath, 2*1024*1024)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("open runtime log: %w", err)
	}

	requestPath := filepath.Join(logDir, "panel-requests.log")
	requestWriter, err := rotlog.NewRotatingFileWriter(requestPath, 10*1024*1024)
	if err != nil {
		_ = runtimeWriter.Close()
		return nil, nil, nil, fmt.Errorf("open request log: %w", err)
	}

	requestLogger := log.New(requestWriter, "[request] ", log.LstdFlags)

	return &multiCloser{closers: []io.Closer{runtimeWriter, requestWriter}}, requestLogger, runtimeWriter, nil
}

type sourceWriter struct {
	hub    *panellog.Hub
	source panellog.LogSource
}

func (s *sourceWriter) Write(p []byte) (int, error) {
	return s.hub.Write(s.source, p)
}

type multiCloser struct {
	closers []io.Closer
}

func (m *multiCloser) Close() error {
	var firstErr error
	for _, c := range m.closers {
		if err := c.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}
