package log

import (
	"bytes"
	"sync"
	"time"
)

const capacity = 200

type subscriber struct {
	ch     chan<- Entry
	source LogSource
}

type Hub struct {
	mu          sync.RWMutex
	buffers     map[LogSource]*Buffer
	subscribers []subscriber
}

func NewHub() *Hub {
	return &Hub{
		buffers: map[LogSource]*Buffer{
			SourceRuntime: NewBuffer(capacity),
			SourceRequest: NewBuffer(capacity),
		},
	}
}

func (h *Hub) Write(source LogSource, p []byte) (int, error) {
	lines := bytes.Split(p, []byte("\n"))
	written := len(p)
	now := time.Now()

	h.mu.Lock()
	buf := h.buffers[source]
	for _, line := range lines {
		trimmed := bytes.TrimSpace(line)
		if len(trimmed) == 0 {
			continue
		}
		e := Entry{
			Timestamp: now,
			Level:     ParseLevel(string(trimmed)),
			Source:    source,
			Message:   string(trimmed),
		}
		buf.Append(e)
		h.broadcastLocked(e)
	}
	h.mu.Unlock()
	return written, nil
}

func (h *Hub) broadcastLocked(e Entry) {
	for _, sub := range h.subscribers {
		if sub.source != e.Source {
			continue
		}
		select {
		case sub.ch <- e:
		default:
		}
	}
}

func (h *Hub) Snapshot(source LogSource) []Entry {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if buf, ok := h.buffers[source]; ok {
		return buf.Snapshot()
	}
	return nil
}

func (h *Hub) Subscribe(source LogSource, ch chan<- Entry) func() {
	h.mu.Lock()
	h.subscribers = append(h.subscribers, subscriber{ch: ch, source: source})
	idx := len(h.subscribers) - 1
	h.mu.Unlock()

	return func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		if idx >= len(h.subscribers) {
			return
		}
		h.subscribers = append(h.subscribers[:idx], h.subscribers[idx+1:]...)
	}
}
