package api

import (
	"net"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/gorilla/mux"

	"github.com/bsdock/panel/internal/config"
	"github.com/bsdock/panel/internal/node"
	"github.com/bsdock/panel/internal/sysinfo"
	wshub "github.com/bsdock/panel/internal/websocket"
)

const panelVersion = "0.1.0"

// PanelStatusHandler exposes Panel runtime and cluster overview.
type PanelStatusHandler struct {
	svc       *node.Service
	cfg       *config.Config
	hub       *wshub.Hub
	startTime time.Time
}

// NewPanelStatusHandler creates a PanelStatusHandler.
func NewPanelStatusHandler(svc *node.Service, cfg *config.Config, hub *wshub.Hub, startTime time.Time) *PanelStatusHandler {
	return &PanelStatusHandler{svc: svc, cfg: cfg, hub: hub, startTime: startTime}
}

// Register adds the panel status route.
func (h *PanelStatusHandler) Register(r *mux.Router) {
	r.HandleFunc("/panel/status", h.Status).Methods("GET")
}

type panelCPU struct {
	Percent float64 `json:"percent"`
	Cores   int     `json:"cores"`
	Model   string  `json:"model"`
}

type panelMemory struct {
	Used  int64 `json:"used"`
	Total int64 `json:"total"`
}

type panelDisk struct {
	Used  int64 `json:"used"`
	Total int64 `json:"total"`
}

type panelNetwork struct {
	Sent     int64 `json:"sent"`
	Received int64 `json:"received"`
}

type panelNodes struct {
	Total   int `json:"total"`
	Online  int `json:"online"`
	Offline int `json:"offline"`
	Pending int `json:"pending"`
}

type panelStatusResponse struct {
	Hostname  string       `json:"hostname"`
	Version   string       `json:"version"`
	GoVersion string       `json:"go_version"`
	Platform  string       `json:"platform"`
	Arch      string       `json:"arch"`
	UptimeSec int64        `json:"uptime_seconds"`
	IPs       []string     `json:"ips"`
	CPU       panelCPU     `json:"cpu"`
	Memory    panelMemory  `json:"memory"`
	Disk      panelDisk    `json:"disk"`
	Network   panelNetwork `json:"network"`
	Nodes     panelNodes   `json:"nodes"`
}

// Status returns the current Panel status.
func (h *PanelStatusHandler) Status(w http.ResponseWriter, r *http.Request) {
	hostname, _ := os.Hostname()

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	diskUsage, err := sysinfo.GetDiskUsage("")
	if err != nil {
		diskUsage = sysinfo.DiskUsage{}
	}

	cpuPercent, _ := sysinfo.CPUPercent()

	ips, _ := listLocalIPs()

	nodes, err := h.svc.List()
	if err != nil {
		nodes = nil
	}

	resp := panelStatusResponse{
		Hostname:  hostname,
		Version:   panelVersion,
		GoVersion: runtime.Version(),
		Platform:  runtime.GOOS,
		Arch:      runtime.GOARCH,
		UptimeSec: int64(time.Since(h.startTime).Seconds()),
		IPs:       ips,
		CPU: panelCPU{
			Percent: cpuPercent,
			Cores:   runtime.NumCPU(),
			Model:   "",
		},
		Memory: panelMemory{
			Used:  int64(memStats.HeapAlloc),
			Total: int64(memStats.Sys),
		},
		Disk: panelDisk{
			Used:  int64(diskUsage.Used),
			Total: int64(diskUsage.Total),
		},
		Network: panelNetwork{
			Sent:     h.hub.SentBytes(),
			Received: h.hub.ReceivedBytes(),
		},
		Nodes: countNodes(nodes),
	}

	respondJSON(w, resp)
}

func listLocalIPs() ([]string, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}
	var ips []string
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}
			if ip == nil || ip.IsLoopback() {
				continue
			}
			if ip4 := ip.To4(); ip4 != nil {
				ips = append(ips, ip4.String())
			}
		}
	}
	return ips, nil
}

func countNodes(nodes []node.Node) panelNodes {
	var result panelNodes
	result.Total = len(nodes)
	for _, n := range nodes {
		switch n.Status {
		case "online":
			result.Online++
		case "offline":
			result.Offline++
		case "pending":
			result.Pending++
		default:
			result.Offline++
		}
	}
	return result
}
