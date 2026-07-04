package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bsdock/agent/internal/config"
	"github.com/bsdock/agent/internal/transport"
)

func main() {
	var cfg config.Config
	flag.StringVar(&cfg.PanelURL, "panel", "", "Panel URL")
	flag.StringVar(&cfg.Token, "token", "", "Install token")
	flag.StringVar(&cfg.Mode, "mode", "auto", "Connection mode: auto|websocket|http|pull")
	flag.BoolVar(&cfg.Insecure, "insecure", false, "Allow ws:// instead of wss://")
	flag.Parse()

	if cfg.PanelURL == "" || cfg.Token == "" {
		log.Fatal("--panel and --token are required")
	}

	client := transport.NewClient(&cfg)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		if err := client.RegisterAndKeepAlive(ctx); err != nil {
			log.Printf("transport error: %v", err)
			cancel()
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	cancel()
}
