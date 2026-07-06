package sysinfo

// DiskUsage describes disk space consumption for a path.
type DiskUsage struct {
	Used  uint64 `json:"used"`
	Total uint64 `json:"total"`
}

// GetDiskUsage returns disk usage for the given path.
// It dispatches to platform-specific implementations.
func GetDiskUsage(path string) (DiskUsage, error) {
	return getDiskUsage(path)
}
