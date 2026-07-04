package log

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// RotatingFileWriter writes to a file and rotates it when it reaches maxSize.
// On rotation, the current file is renamed to "<path>.old" and a new file is
// created. It is safe for concurrent use by multiple goroutines.
type RotatingFileWriter struct {
	mu      sync.Mutex
	path    string
	maxSize int64
	file    *os.File
	size    int64
}

// NewRotatingFileWriter opens the log file at path and returns a writer that
// rotates the file when it grows beyond maxSize bytes.
func NewRotatingFileWriter(path string, maxSize int64) (*RotatingFileWriter, error) {
	if maxSize <= 0 {
		return nil, fmt.Errorf("maxSize must be positive")
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("create log directory: %w", err)
	}

	file, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("open log file: %w", err)
	}

	info, err := file.Stat()
	if err != nil {
		_ = file.Close()
		return nil, fmt.Errorf("stat log file: %w", err)
	}

	return &RotatingFileWriter{
		path:    path,
		maxSize: maxSize,
		file:    file,
		size:    info.Size(),
	}, nil
}

// Write implements io.Writer. It rotates the underlying file when the next
// write would cause it to exceed maxSize.
func (w *RotatingFileWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.file == nil {
		return 0, fmt.Errorf("log file is closed")
	}

	if w.size+int64(len(p)) > w.maxSize {
		if err := w.rotateLocked(); err != nil {
			return 0, err
		}
	}

	n, err := w.file.Write(p)
	w.size += int64(n)
	return n, err
}

// Close closes the current log file.
func (w *RotatingFileWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.file == nil {
		return nil
	}
	err := w.file.Close()
	w.file = nil
	w.size = 0
	return err
}

// rotateLocked closes the current file, renames it to "<path>.old", and opens
// a new file. The caller must hold w.mu.
func (w *RotatingFileWriter) rotateLocked() error {
	if err := w.file.Close(); err != nil {
		return fmt.Errorf("close log file for rotation: %w", err)
	}

	oldPath := w.path + ".old"
	_ = os.Remove(oldPath)
	if err := os.Rename(w.path, oldPath); err != nil {
		// Attempt to reopen the original file so writes can continue.
		_ = w.reopenLocked()
		return fmt.Errorf("rotate log file: %w", err)
	}

	return w.reopenLocked()
}

// reopenLocked opens a new file at w.path and resets w.size. The caller must
// hold w.mu.
func (w *RotatingFileWriter) reopenLocked() error {
	file, err := os.OpenFile(w.path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		w.file = nil
		w.size = 0
		return fmt.Errorf("reopen log file: %w", err)
	}

	info, err := file.Stat()
	if err != nil {
		_ = file.Close()
		w.file = nil
		w.size = 0
		return fmt.Errorf("stat new log file: %w", err)
	}

	w.file = file
	w.size = info.Size()
	return nil
}
