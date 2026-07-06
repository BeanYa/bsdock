package sysinfo

// CPUPercent returns the current system-wide CPU utilization percentage
// averaged across all cores. Platform-specific implementations may return 0
// when the metric cannot be determined without external dependencies.
func CPUPercent() (float64, error) {
	return cpuPercent()
}
