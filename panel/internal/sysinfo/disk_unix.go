//go:build !windows

package sysinfo

import "syscall"

func getDiskUsage(path string) (DiskUsage, error) {
	if path == "" {
		path = "."
	}
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return DiskUsage{}, err
	}
	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bfree * uint64(stat.Bsize)
	used := total - free
	return DiskUsage{Used: used, Total: total}, nil
}
