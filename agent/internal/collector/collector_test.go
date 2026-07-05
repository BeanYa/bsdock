package collector

import (
	"math"
	"testing"
)

func TestCollect(t *testing.T) {
	info, err := Collect()
	if err != nil {
		t.Fatal(err)
	}
	if info.Hostname == "" {
		t.Fatal("expected hostname")
	}
	if info.OS == "" {
		t.Fatal("expected os")
	}
	if info.Arch == "" {
		t.Fatal("expected arch")
	}
	if info.CPUCores <= 0 {
		t.Fatal("expected cpu cores")
	}
	if info.MemoryTotal <= 0 {
		t.Fatal("expected memory")
	}
}

func TestCollect_RuntimeMetrics(t *testing.T) {
	info, err := Collect()
	if err != nil {
		t.Fatalf("collect failed: %v", err)
	}
	if info.CPUPercent < 0 || info.CPUPercent > 100 {
		t.Errorf("cpu_percent out of range: %v", info.CPUPercent)
	}
	if math.IsNaN(info.CPUPercent) {
		t.Errorf("cpu_percent is NaN")
	}
	if info.MemoryUsed < 0 {
		t.Errorf("memory_used negative: %v", info.MemoryUsed)
	}
	if info.MemoryFree < 0 {
		t.Errorf("memory_free negative: %v", info.MemoryFree)
	}
	if info.MemoryTotal <= 0 {
		t.Fatalf("memory_total not positive: %v", info.MemoryTotal)
	}
	// Used + Free may differ slightly from Total due to rounding/buffers; allow 5% slack.
	sum := info.MemoryUsed + info.MemoryFree
	if sum < int64(float64(info.MemoryTotal)*0.95) || sum > int64(float64(info.MemoryTotal)*1.05) {
		t.Errorf("memory_used + memory_free (%d) not close to memory_total (%d)", sum, info.MemoryTotal)
	}
}
