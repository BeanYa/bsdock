package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/api"
	"github.com/bsdock/panel/internal/auth"
	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/db"
	"github.com/bsdock/panel/internal/node"
	wshub "github.com/bsdock/panel/internal/websocket"
)

func main() {
	cfg, err := config.Load("")
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

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

	r := mux.NewRouter()

	// Agent endpoints (public)
	agentWS := api.NewAgentWSHandler(nodeSvc, queries, cfg, hub)
	agentWS.Register(r)
	agentHTTP := api.NewAgentHTTPHandler(sqlDB, queries, cfg)
	agentHTTP.Register(r)

	// Frontend WebSocket for real-time updates (public path; token validated in handler)
	frontendWS := api.NewFrontendWSHandler(hub, cfg)
	frontendWS.Register(r)

	// API routes with auth
	apiRouter := r.PathPrefix("/api/v1").Subrouter()
	apiRouter.Use(api.AuthMiddleware(cfg))
	authHandler := api.NewAuthHandler(queries, cfg)
	apiRouter.HandleFunc("/login", authHandler.Login).Methods("POST")

	nodesHandler := api.NewNodesHandler(nodeSvc, cfg)
	nodesHandler.Register(apiRouter)

	// Install scripts (no auth)
	r.HandleFunc("/install-agent.sh", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "scripts/install-agent.sh")
	}).Methods("GET")
	r.HandleFunc("/install-agent.ps1", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "scripts/install-agent.ps1")
	}).Methods("GET")

	// Agent binaries (no auth)
	r.PathPrefix("/static/agent/").Handler(http.StripPrefix("/static/agent/", http.FileServer(http.Dir("./dist"))))

	// Static files (no auth)
	static, err := api.StaticHandler()
	if err != nil {
		log.Fatalf("static handler: %v", err)
	}
	r.PathPrefix("/").Handler(static)

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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}
}
