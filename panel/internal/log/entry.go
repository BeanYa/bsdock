package log

import (
	"strings"
	"time"
)

type LogSource string

const (
	SourceRuntime LogSource = "runtime"
	SourceRequest LogSource = "request"
)

type LogLevel string

const (
	LevelInfo  LogLevel = "INFO"
	LevelWarn  LogLevel = "WARN"
	LevelError LogLevel = "ERROR"
	LevelDebug LogLevel = "DEBUG"
)

type Entry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     LogLevel  `json:"level"`
	Source    LogSource `json:"source"`
	Message   string    `json:"message"`
}

func ParseLevel(line string) LogLevel {
	upper := strings.ToUpper(line)
	if strings.Contains(upper, "ERROR") || strings.Contains(upper, "FATAL") || strings.Contains(upper, "PANIC") {
		return LevelError
	}
	if strings.Contains(upper, "WARN") {
		return LevelWarn
	}
	if strings.Contains(upper, "DEBUG") {
		return LevelDebug
	}
	return LevelInfo
}
