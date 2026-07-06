package log

import "sync"

type Buffer struct {
	mu       sync.RWMutex
	capacity int
	entries  []Entry
}

func NewBuffer(capacity int) *Buffer {
	return &Buffer{capacity: capacity}
}

func (b *Buffer) Append(e Entry) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.capacity <= 0 {
		return false
	}
	if len(b.entries) >= b.capacity {
		b.entries = b.entries[1:]
	}
	b.entries = append(b.entries, e)
	return true
}

func (b *Buffer) Snapshot() []Entry {
	b.mu.RLock()
	defer b.mu.RUnlock()
	out := make([]Entry, len(b.entries))
	copy(out, b.entries)
	return out
}
