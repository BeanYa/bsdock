//go:build windows

package sysinfo

import (
	"syscall"
	"unsafe"
)

func getDiskUsage(path string) (DiskUsage, error) {
	if path == "" {
		path = "."
	}
	pathPtr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return DiskUsage{}, err
	}

	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	procGetDiskFreeSpaceEx := kernel32.NewProc("GetDiskFreeSpaceExW")

	var free, total uint64
	ret, _, err := procGetDiskFreeSpaceEx.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		uintptr(unsafe.Pointer(&free)),
		uintptr(unsafe.Pointer(&total)),
		0,
	)
	if ret == 0 {
		return DiskUsage{}, err
	}

	used := total - free
	return DiskUsage{Used: used, Total: total}, nil
}
