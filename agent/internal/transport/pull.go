package transport

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/bsdock/agent/internal/collector"
)

func (c *Client) runPull(ctx context.Context, info *collector.SystemInfo) error {
	endpoint := c.cfg.PanelURL + "/api/v1/agent/poll"
	connected := false
	for {
		select {
		case <-ctx.Done():
			log.Printf("agent pull disconnecting: %v", ctx.Err())
			return ctx.Err()
		default:
		}

		b := jsonBytes(c.buildReportPayload(info))
		req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(b))
		if err != nil {
			log.Printf("agent pull request error: %v", err)
			return err
		}
		req.Header.Set("Content-Type", "application/json")

		interval := c.pollOnce(req, &connected)
		time.Sleep(interval)
	}
}

// pollOnce performs a single poll request, decodes the server response, and
// returns the requested next-report interval. The response body is closed via
// defer before the function returns.
func (c *Client) pollOnce(req *http.Request, connected *bool) time.Duration {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("agent poll error: %v", err)
		return 10 * time.Second
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("agent poll unexpected status: %d", resp.StatusCode)
		return 10 * time.Second
	}

	var ack struct {
		NextReportSeconds int `json:"next_report_seconds"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&ack); err != nil {
		log.Printf("agent poll decode error: %v", err)
		return 10 * time.Second
	}

	if !*connected {
		log.Printf("agent connected to panel via pull: %s", c.cfg.PanelURL)
		*connected = true
	}
	log.Printf("agent poll reported, next in %ds", ack.NextReportSeconds)

	interval := time.Duration(ack.NextReportSeconds) * time.Second
	if interval < 5*time.Second {
		interval = 10 * time.Second
	}
	return interval
}
