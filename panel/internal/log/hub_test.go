package log

import (
	"testing"
	"time"
)

func TestHubWriteAndSnapshot(t *testing.T) {
	h := NewHub()
	h.Write(SourceRuntime, []byte("hello world\n"))
	snap := h.Snapshot(SourceRuntime)
	if len(snap) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(snap))
	}
	if snap[0].Message != "hello world" {
		t.Fatalf("unexpected message %q", snap[0].Message)
	}
	if snap[0].Source != SourceRuntime {
		t.Fatalf("unexpected source %q", snap[0].Source)
	}
}

func TestHubSubscribe(t *testing.T) {
	h := NewHub()
	ch := make(chan Entry, 1)
	unsub := h.Subscribe(SourceRuntime, ch)
	defer unsub()
	h.Write(SourceRuntime, []byte("event\n"))
	select {
	case e := <-ch:
		if e.Message != "event" {
			t.Fatalf("unexpected message %q", e.Message)
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for entry")
	}
}

func TestHubSubscribeFilteredBySource(t *testing.T) {
	h := NewHub()
	ch := make(chan Entry, 1)
	unsub := h.Subscribe(SourceRuntime, ch)
	defer unsub()
	h.Write(SourceRequest, []byte("request log\n"))
	select {
	case <-ch:
		t.Fatal("should not receive entry from other source")
	case <-time.After(100 * time.Millisecond):
	}
}

func TestHubCapacity(t *testing.T) {
	h := NewHub()
	for i := 0; i < capacity+50; i++ {
		h.Write(SourceRuntime, []byte("line\n"))
	}
	snap := h.Snapshot(SourceRuntime)
	if len(snap) != capacity {
		t.Fatalf("expected capacity %d, got %d", capacity, len(snap))
	}
}
