//go:build linux

package sysinfo

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	cpuMu          sync.Mutex
	cpuLastTotal   uint64
	cpuLastIdle    uint64
	cpuInitialized bool
)

func readCPUTimes() (total, idle uint64, err error) {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "cpu ") {
			continue
		}
		fields := strings.Fields(line)[1:]
		if len(fields) < 4 {
			return 0, 0, fmt.Errorf("unexpected /proc/stat format")
		}
		var values [10]uint64
		for i := 0; i < len(fields) && i < len(values); i++ {
			v, err := strconv.ParseUint(fields[i], 10, 64)
			if err != nil {
				return 0, 0, err
			}
			values[i] = v
			total += v
		}
		idle = values[3]
		return total, idle, nil
	}
	return 0, 0, fmt.Errorf("cpu line not found in /proc/stat")
}

func cpuPercent() (float64, error) {
	total, idle, err := readCPUTimes()
	if err != nil {
		return 0, err
	}

	cpuMu.Lock()
	defer cpuMu.Unlock()

	if !cpuInitialized {
		cpuLastTotal = total
		cpuLastIdle = idle
		cpuInitialized = true
		time.Sleep(100 * time.Millisecond)
		total, idle, err = readCPUTimes()
		if err != nil {
			return 0, err
		}
	}

	dTotal := total - cpuLastTotal
	dIdle := idle - cpuLastIdle

	cpuLastTotal = total
	cpuLastIdle = idle

	if dTotal == 0 {
		return 0, nil
	}
	used := dTotal - dIdle
	pct := (float64(used) / float64(dTotal)) * 100
	return pct, nil
}
