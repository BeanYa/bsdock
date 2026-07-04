package collector

import (
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
