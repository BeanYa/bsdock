package log

import "testing"

func TestParseLevel(t *testing.T) {
	cases := []struct {
		input string
		want  LogLevel
	}{
		{"2026/07/06 14:32:01 INFO: hello", LevelInfo},
		{"2026/07/06 14:32:01 WARN: hello", LevelWarn},
		{"2026/07/06 14:32:01 ERROR: hello", LevelError},
		{"2026/07/06 14:32:01 DEBUG: hello", LevelDebug},
		{"plain message", LevelInfo},
		{"FATAL: something went wrong", LevelError},
		{"panic: runtime error", LevelError},
	}
	for _, c := range cases {
		got := ParseLevel(c.input)
		if got != c.want {
			t.Errorf("ParseLevel(%q) = %q, want %q", c.input, got, c.want)
		}
	}
}
