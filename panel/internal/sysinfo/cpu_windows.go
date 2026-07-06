//go:build windows

package sysinfo

import (
	"syscall"
	"unsafe"
)

var (
	kernel32           = syscall.NewLazyDLL("kernel32.dll")
	procGetSystemTimes = kernel32.NewProc("GetSystemTimes")
)

var (
	cpuLastIdle    uint64
	cpuLastKernel  uint64
	cpuLastUser    uint64
	cpuInitialized bool
)

func getSystemTimes() (idle, kernel, user uint64, err error) {
	var idleFT, kernelFT, userFT syscall.Filetime
	r, _, e := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idleFT)),
		uintptr(unsafe.Pointer(&kernelFT)),
		uintptr(unsafe.Pointer(&userFT)),
	)
	if r == 0 {
		return 0, 0, 0, e
	}
	return uint64(idleFT.HighDateTime)<<32 | uint64(idleFT.LowDateTime),
		uint64(kernelFT.HighDateTime)<<32 | uint64(kernelFT.LowDateTime),
		uint64(userFT.HighDateTime)<<32 | uint64(userFT.LowDateTime),
		nil
}

func cpuPercent() (float64, error) {
	idle, kernel, user, err := getSystemTimes()
	if err != nil {
		return 0, err
	}

	if !cpuInitialized {
		cpuLastIdle = idle
		cpuLastKernel = kernel
		cpuLastUser = user
		cpuInitialized = true
		// Need a delta; sample again after a short sleep.
		sleep(100)
		idle, kernel, user, err = getSystemTimes()
		if err != nil {
			return 0, err
		}
	}

	dIdle := idle - cpuLastIdle
	dKernel := kernel - cpuLastKernel
	dUser := user - cpuLastUser

	cpuLastIdle = idle
	cpuLastKernel = kernel
	cpuLastUser = user

	total := dKernel + dUser
	if total == 0 {
		return 0, nil
	}
	used := total - dIdle
	if used > total {
		used = total
	}
	return (float64(used) / float64(total)) * 100, nil
}

// sleep is a tiny wrapper to avoid importing time just for one call.
// It sleeps for n milliseconds using Windows Sleep API.
func sleep(ms int) {
	modkernel32 := syscall.NewLazyDLL("kernel32.dll")
	procSleep := modkernel32.NewProc("Sleep")
	procSleep.Call(uintptr(ms))
}
