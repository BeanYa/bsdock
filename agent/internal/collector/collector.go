package collector

import (
	"math"
	"net"
	"runtime"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
)

type SystemInfo struct {
	Hostname    string   `json:"hostname"`
	OS          string   `json:"os"`
	Arch        string   `json:"arch"`
	Kernel      string   `json:"kernel"`
	CPUModel    string   `json:"cpu_model"`
	CPUCores    int      `json:"cpu_cores"`
	MemoryTotal int64    `json:"memory_total"`
	DiskTotal   int64    `json:"disk_total"`
	DiskFree    int64    `json:"disk_free"`
	IPs         []string `json:"ips"`
	Uptime      uint64   `json:"uptime"`
	CPUPercent  float64  `json:"cpu_percent"`
	MemoryUsed  int64    `json:"memory_used"`
	MemoryFree  int64    `json:"memory_free"`
}

func Collect() (*SystemInfo, error) {
	hostInfo, err := host.Info()
	if err != nil {
		return nil, err
	}

	cpuInfo, err := cpu.Info()
	if err != nil {
		return nil, err
	}
	cpuModel := ""
	if len(cpuInfo) > 0 {
		cpuModel = cpuInfo[0].ModelName
	}
	cpuCounts, _ := cpu.Counts(true)

	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	var cpuPercent float64
	if percents, err := cpu.Percent(0, false); err == nil && len(percents) > 0 {
		cpuPercent = percents[0]
	}
	if math.IsNaN(cpuPercent) {
		cpuPercent = 0
	}
	if cpuPercent < 0 {
		cpuPercent = 0
	}
	if cpuPercent > 100 {
		cpuPercent = 100
	}

	diskInfo, err := disk.Usage("/")
	if err != nil {
		return nil, err
	}

	ips := collectIPs()

	return &SystemInfo{
		Hostname:    hostInfo.Hostname,
		OS:          hostInfo.OS,
		Arch:        runtime.GOARCH,
		Kernel:      hostInfo.KernelVersion,
		CPUModel:    cpuModel,
		CPUCores:    cpuCounts,
		MemoryTotal: int64(memInfo.Total),
		DiskTotal:   int64(diskInfo.Total),
		DiskFree:    int64(diskInfo.Free),
		IPs:         ips,
		Uptime:      hostInfo.Uptime,
		CPUPercent:  cpuPercent,
		MemoryUsed:  int64(memInfo.Used),
		MemoryFree:  int64(memInfo.Free),
	}, nil
}

func collectIPs() []string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return nil
	}
	var ips []string
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			ips = append(ips, ipnet.IP.String())
		}
	}
	return ips
}
