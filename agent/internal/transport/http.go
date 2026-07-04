package transport

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/bsdock/agent/internal/collector"
)

func (c *Client) runHTTP(ctx context.Context, info *collector.SystemInfo) error {
	endpoint := c.cfg.PanelURL + "/api/v1/agent/report"
	if err := c.post(ctx, endpoint, c.buildPayload(info)); err != nil {
		return err
	}

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := c.post(ctx, endpoint, c.buildHeartbeat()); err != nil {
				return err
			}
		}
	}
}

func (c *Client) post(ctx context.Context, endpoint string, body interface{}) error {
	b := jsonBytes(body)
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}
