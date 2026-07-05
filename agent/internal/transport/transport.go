package transport

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bsdock/agent/internal/collector"
	"github.com/bsdock/agent/internal/config"
)

type Client struct {
	cfg  *config.Config
	mode string
}

func NewClient(cfg *config.Config) *Client {
	mode := cfg.Mode
	if mode == "" {
		mode = "auto"
	}
	return &Client{cfg: cfg, mode: mode}
}

func (c *Client) RegisterAndKeepAlive(ctx context.Context) error {
	info, err := collector.Collect()
	if err != nil {
		return fmt.Errorf("collect: %w", err)
	}

	modes := c.resolveModes()
	for _, m := range modes {
		if err := c.tryMode(ctx, m, info); err == nil {
			return nil
		}
	}
	return fmt.Errorf("all transport modes failed")
}

func (c *Client) resolveModes() []string {
	if c.mode != "auto" {
		return []string{c.mode}
	}
	return []string{"websocket", "http", "pull"}
}

func (c *Client) tryMode(ctx context.Context, mode string, info *collector.SystemInfo) error {
	switch mode {
	case "websocket":
		return c.runWebSocket(ctx, info)
	case "http":
		return c.runHTTP(ctx, info)
	case "pull":
		return c.runPull(ctx, info)
	}
	return fmt.Errorf("unknown mode: %s", mode)
}

func (c *Client) buildPayload(info *collector.SystemInfo) map[string]interface{} {
	payload := map[string]interface{}{
		"token":        c.cfg.Token,
		"hostname":     info.Hostname,
		"os":           info.OS,
		"arch":         info.Arch,
		"kernel":       info.Kernel,
		"cpu_model":    info.CPUModel,
		"cpu_cores":    info.CPUCores,
		"cpu_percent":  info.CPUPercent,
		"memory_total": info.MemoryTotal,
		"memory_used":  info.MemoryUsed,
		"memory_free":  info.MemoryFree,
		"disk_total":   info.DiskTotal,
		"disk_free":    info.DiskFree,
		"ips":          info.IPs,
		"uptime":       info.Uptime,
	}
	return map[string]interface{}{
		"type":    "register",
		"payload": payload,
	}
}

func (c *Client) buildReportPayload(info *collector.SystemInfo) map[string]interface{} {
	return map[string]interface{}{
		"token":        c.cfg.Token,
		"hostname":     info.Hostname,
		"os":           info.OS,
		"arch":         info.Arch,
		"kernel":       info.Kernel,
		"cpu_model":    info.CPUModel,
		"cpu_cores":    info.CPUCores,
		"cpu_percent":  info.CPUPercent,
		"memory_total": info.MemoryTotal,
		"memory_used":  info.MemoryUsed,
		"memory_free":  info.MemoryFree,
		"disk_total":   info.DiskTotal,
		"disk_free":    info.DiskFree,
		"ips":          info.IPs,
		"uptime":       info.Uptime,
	}
}

func (c *Client) buildHeartbeat() map[string]interface{} {
	return map[string]interface{}{
		"type":        "metrics",
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"token":       c.cfg.Token,
		"cpu_percent": 0.0,
		"memory_used": 0,
		"memory_free": 0,
	}
}

func jsonBytes(v interface{}) []byte {
	b, _ := json.Marshal(v)
	return b
}
