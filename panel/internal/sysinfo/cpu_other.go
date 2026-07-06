//go:build !windows && !linux && !darwin

package sysinfo

func cpuPercent() (float64, error) {
	return 0, nil
}
