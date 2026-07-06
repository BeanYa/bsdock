package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/bsdock/agent/internal/config"
	"github.com/bsdock/agent/internal/transport"
	rotlog "github.com/bsdock/pkg/rotlog"
)

func main() {
	var cfg config.Config
	flag.StringVar(&cfg.PanelURL, "panel", "", "Panel URL")
	flag.StringVar(&cfg.Token, "token", "", "Install token")
	flag.StringVar(&cfg.Mode, "mode", "auto", "Connection mode: auto|websocket|http|pull")
	flag.BoolVar(&cfg.Insecure, "insecure", false, "Allow ws:// instead of wss://")
	flag.Parse()

	if cfg.PanelURL == "" || cfg.Token == "" {
		fmt.Fprintln(os.Stderr, "--panel and --token are required")
		os.Exit(1)
	}

	if err := setupLogging(); err != nil {
		fmt.Fprintf(os.Stderr, "warning: falling back to stderr logging: %v\n", err)
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

func setupLogging() error {
	exe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("determine executable path: %w", err)
	}
	logPath := filepath.Join(filepath.Dir(exe), "agent.log")

	writer, err := rotlog.NewRotatingFileWriter(logPath, 2*1024*1024)
	if err != nil {
		return err
	}
	log.SetOutput(writer)
	return nil
}
