package transport

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/bsdock/agent/internal/collector"
)

func (c *Client) runHTTP(ctx context.Context, info *collector.SystemInfo) error {
	endpoint := c.cfg.PanelURL + "/api/v1/agent/report"
	if err := c.post(ctx, endpoint, c.buildReportPayload(info)); err != nil {
		return err
	}
	log.Printf("agent connected to panel via http: %s", c.cfg.PanelURL)

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Printf("agent http disconnecting: %v", ctx.Err())
			return ctx.Err()
		case <-ticker.C:
			latest, err := collector.Collect()
			if err != nil {
				log.Printf("agent http collect error: %v", err)
				latest = info
			}
			if err := c.post(ctx, endpoint, c.buildReportPayload(latest)); err != nil {
				return err
			}
		}
	}
}

func (c *Client) post(ctx context.Context, endpoint string, body interface{}) error {
	b := jsonBytes(body)
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(b))
	if err != nil {
		log.Printf("agent http request error: %v", err)
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("agent http send error: %v", err)
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("unexpected status: %d", resp.StatusCode)
		log.Printf("agent http response error: %v", err)
		return err
	}
	log.Printf("agent report sent via http")
	return nil
}
