package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/bsdock/agent/internal/collector"
)

func (c *Client) runPull(ctx context.Context, info *collector.SystemInfo) error {
	endpoint := c.cfg.PanelURL + "/api/v1/agent/poll"
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		b := jsonBytes(c.buildPayload(info))
		req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(b))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			time.Sleep(10 * time.Second)
			continue
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			time.Sleep(10 * time.Second)
			continue
		}

		var ack struct {
			NextReportSeconds int `json:"next_report_seconds"`
		}
		json.NewDecoder(resp.Body).Decode(&ack)
		interval := time.Duration(ack.NextReportSeconds) * time.Second
		if interval < 5*time.Second {
			interval = 10 * time.Second
		}
		time.Sleep(interval)
	}
}
