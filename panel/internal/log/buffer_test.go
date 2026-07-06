package log

import "testing"

func TestBufferSnapshotOrder(t *testing.T) {
	b := NewBuffer(3)
	b.Append(Entry{Message: "a"})
	b.Append(Entry{Message: "b"})
	b.Append(Entry{Message: "c"})
	snap := b.Snapshot()
	if len(snap) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(snap))
	}
	if snap[0].Message != "a" || snap[1].Message != "b" || snap[2].Message != "c" {
		t.Fatalf("unexpected snapshot order: %v", snap)
	}
}

func TestBufferDropsOld(t *testing.T) {
	b := NewBuffer(2)
	b.Append(Entry{Message: "a"})
	b.Append(Entry{Message: "b"})
	b.Append(Entry{Message: "c"})
	snap := b.Snapshot()
	if len(snap) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(snap))
	}
	if snap[0].Message != "b" || snap[1].Message != "c" {
		t.Fatalf("expected [b c], got %v", snap)
	}
}

func TestBufferZeroCapacity(t *testing.T) {
	b := NewBuffer(0)
	if b.Append(Entry{Message: "a"}) {
		t.Fatal("expected append to fail with zero capacity")
	}
}
