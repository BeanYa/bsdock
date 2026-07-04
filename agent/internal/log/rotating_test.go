package log

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestRotatingFileWriter_CreatesFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "agent.log")

	w, err := NewRotatingFileWriter(path, 1024)
	if err != nil {
		t.Fatalf("create writer: %v", err)
	}
	defer w.Close()

	if _, err := os.Stat(path); err != nil {
		t.Fatalf("log file not created: %v", err)
	}
}

func TestRotatingFileWriter_WritesAndRotates(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "agent.log")
	maxSize := int64(64)

	w, err := NewRotatingFileWriter(path, maxSize)
	if err != nil {
		t.Fatalf("create writer: %v", err)
	}

	line := "test log line\n"
	// Fill the first file without exceeding the limit.
	for i := 0; i < 3; i++ {
		if _, err := w.Write([]byte(line)); err != nil {
			t.Fatalf("write failed: %v", err)
		}
	}

	// This write pushes the file over maxSize and triggers rotation.
	if _, err := w.Write([]byte(strings.Repeat("x", int(maxSize)))); err != nil {
		t.Fatalf("write that triggers rotation failed: %v", err)
	}

	if err := w.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	oldPath := path + ".old"
	if _, err := os.Stat(oldPath); err != nil {
		t.Fatalf("rotated log file %s not found: %v", oldPath, err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("current log file not found: %v", err)
	}
	if info.Size() == 0 {
		t.Fatalf("current log file is empty after rotation")
	}
	if info.Size() > maxSize {
		t.Fatalf("current log file size %d exceeds max %d", info.Size(), maxSize)
	}
}

func TestRotatingFileWriter_ConcurrentWrites(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "agent.log")

	w, err := NewRotatingFileWriter(path, 1024*1024)
	if err != nil {
		t.Fatalf("create writer: %v", err)
	}
	defer w.Close()

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				msg := fmt.Sprintf("goroutine %d message %d\n", n, j)
				if _, err := w.Write([]byte(msg)); err != nil {
					t.Errorf("concurrent write failed: %v", err)
					return
				}
			}
		}(i)
	}
	wg.Wait()

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read log file: %v", err)
	}

	expectedLines := 10 * 50
	actualLines := strings.Count(string(data), "\n")
	if actualLines != expectedLines {
		t.Fatalf("expected %d lines, got %d", expectedLines, actualLines)
	}
}

func TestRotatingFileWriter_InvalidMaxSize(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "agent.log")

	if _, err := NewRotatingFileWriter(path, 0); err == nil {
		t.Fatal("expected error for zero maxSize")
	}
}

func TestRotatingFileWriter_CloseIsSafe(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "agent.log")

	w, err := NewRotatingFileWriter(path, 1024)
	if err != nil {
		t.Fatalf("create writer: %v", err)
	}

	if err := w.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}
	if err := w.Close(); err != nil {
		t.Fatalf("second close should be safe: %v", err)
	}
	if _, err := w.Write([]byte("after close")); err == nil {
		t.Fatal("expected error writing to closed writer")
	}
}
