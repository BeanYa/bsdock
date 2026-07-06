//go:build darwin

package sysinfo

import (
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	cpuMu          sync.Mutex
	cpuLastUser    float64
	cpuLastSystem  float64
	cpuLastIdle    float64
	cpuInitialized bool
)

func readCPUUsage() (user, system, idle float64, err error) {
	out, err := exec.Command("iostat", "-c", "1").Output()
	if err != nil {
		return 0, 0, 0, err
	}
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}
		// iostat -c output lines look like: "  user sys idle"
		u, err1 := strconv.ParseFloat(fields[0], 64)
		s, err2 := strconv.ParseFloat(fields[1], 64)
		i, err3 := strconv.ParseFloat(fields[2], 64)
		if err1 == nil && err2 == nil && err3 == nil {
			return u, s, i, nil
		}
	}
	return 0, 0, 0, nil
}

func cpuPercent() (float64, error) {
	user, system, idle, err := readCPUUsage()
	if err != nil {
		return 0, err
	}

	cpuMu.Lock()
	defer cpuMu.Unlock()

	if !cpuInitialized {
		cpuLastUser = user
		cpuLastSystem = system
		cpuLastIdle = idle
		cpuInitialized = true
		time.Sleep(100 * time.Millisecond)
		user, system, idle, err = readCPUUsage()
		if err != nil {
			return 0, err
		}
	}

	dUser := user - cpuLastUser
	dSystem := system - cpuLastSystem
	dIdle := idle - cpuLastIdle

	cpuLastUser = user
	cpuLastSystem = system
	cpuLastIdle = idle

	total := dUser + dSystem + dIdle
	if total <= 0 {
		return 0, nil
	}
	return ((dUser + dSystem) / total) * 100, nil
}
