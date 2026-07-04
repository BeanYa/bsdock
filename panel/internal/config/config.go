package config

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Mode     string   `yaml:"mode"`
	Port     string   `yaml:"port"`
	Database Database `yaml:"database"`
	JWT      JWT      `yaml:"jwt"`
	Admin    Admin    `yaml:"admin"`
	Agent    Agent    `yaml:"agent"`
	Log      Log      `yaml:"log"`
}

type Database struct {
	Path string `yaml:"path"`
}

type JWT struct {
	Secret      string `yaml:"secret"`
	ExpireHours int    `yaml:"expire_hours"`
}

type Admin struct {
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

type Agent struct {
	AllowedModes            []string `yaml:"allowed_modes"`
	DefaultMode             string   `yaml:"default_mode"`
	HeartbeatTimeoutSeconds int      `yaml:"heartbeat_timeout_seconds"`
	InstallTokenExpireHours int      `yaml:"install_token_expire_hours"`
}

type Log struct {
	Level string `yaml:"level"`
}

func Load(path string) (*Config, error) {
	cfg := &Config{
		Mode: "master",
		Port: "8080",
		Database: Database{Path: "./panel.db"},
		JWT:      JWT{ExpireHours: 24},
		Agent: Agent{
			AllowedModes:            []string{"websocket", "http", "pull"},
			DefaultMode:             "auto",
			HeartbeatTimeoutSeconds: 60,
			InstallTokenExpireHours: 24,
		},
		Log: Log{Level: "info"},
	}

	if path == "" {
		path = "./config.yaml"
	}

	if data, err := os.ReadFile(path); err == nil {
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("parse config: %w", err)
		}
	}

	applyEnv(cfg)
	return cfg, nil
}

func applyEnv(cfg *Config) {
	if v := os.Getenv("BSDOCK_MODE"); v != "" {
		cfg.Mode = v
	}
	if v := os.Getenv("BSDOCK_PORT"); v != "" {
		cfg.Port = v
	}
	if v := os.Getenv("BSDOCK_DB_PATH"); v != "" {
		cfg.Database.Path = v
	}
	if v := os.Getenv("BSDOCK_JWT_SECRET"); v != "" {
		cfg.JWT.Secret = v
	}
	if v := os.Getenv("BSDOCK_JWT_EXPIRE_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.JWT.ExpireHours = n
		}
	}
	if v := os.Getenv("BSDOCK_ADMIN_USERNAME"); v != "" {
		cfg.Admin.Username = v
	}
	if v := os.Getenv("BSDOCK_ADMIN_PASSWORD"); v != "" {
		cfg.Admin.Password = v
	}
}
