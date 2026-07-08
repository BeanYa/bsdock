package config

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Mode     string   `yaml:"mode"`
	Address  string   `yaml:"address"`
	Port     string   `yaml:"port"`
	BaseURI  string   `yaml:"base_uri"`
	Domain   string   `yaml:"domain"`
	PanelURI string   `yaml:"panel_uri"`
	TLS      TLS      `yaml:"tls"`
	Database Database `yaml:"database"`
	JWT      JWT      `yaml:"jwt"`
	Admin    Admin    `yaml:"admin"`
	Agent    Agent    `yaml:"agent"`
	Log      Log      `yaml:"log"`
	Timezone string   `yaml:"timezone"`
}

type Database struct {
	Path string `yaml:"path"`
}

type JWT struct {
	Secret      string `yaml:"secret"`
	ExpireHours int    `yaml:"expire_hours"`
}

type TLS struct {
	CertPath string `yaml:"cert_path"`
	KeyPath  string `yaml:"key_path"`
}

type Admin struct {
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

type Agent struct {
	AllowedModes            []string `yaml:"allowed_modes"`
	DefaultMode             string   `yaml:"default_mode"`
	HeartbeatTimeoutSeconds int      `yaml:"heartbeat_timeout_seconds"`
}

type Log struct {
	Level string `yaml:"level"`
}

func Load(path string) (*Config, error) {
	cfg := &Config{
		Mode:     "master",
		Address:  "",
		Port:     "8080",
		BaseURI:  "/",
		Database: Database{Path: "./panel.db"},
		JWT:      JWT{ExpireHours: 24},
		Agent: Agent{
			AllowedModes:            []string{"websocket", "http", "pull"},
			DefaultMode:             "auto",
			HeartbeatTimeoutSeconds: 60,
		},
		Log:      Log{Level: "info"},
		Timezone: "Asia/Shanghai",
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

func Save(path string, cfg *Config) error {
	if path == "" {
		path = "./config.yaml"
	}
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("write config: %w", err)
	}
	return nil
}

func applyEnv(cfg *Config) {
	if v := os.Getenv("BSDOCK_MODE"); v != "" {
		cfg.Mode = v
	}
	if v := os.Getenv("BSDOCK_ADDRESS"); v != "" {
		cfg.Address = v
	}
	if v := os.Getenv("BSDOCK_PORT"); v != "" {
		cfg.Port = v
	}
	if v := os.Getenv("BSDOCK_BASE_URI"); v != "" {
		cfg.BaseURI = v
	}
	if v := os.Getenv("BSDOCK_DOMAIN"); v != "" {
		cfg.Domain = v
	}
	if v := os.Getenv("BSDOCK_PANEL_URI"); v != "" {
		cfg.PanelURI = v
	}
	if v := os.Getenv("BSDOCK_TLS_CERT_PATH"); v != "" {
		cfg.TLS.CertPath = v
	}
	if v := os.Getenv("BSDOCK_TLS_KEY_PATH"); v != "" {
		cfg.TLS.KeyPath = v
	}
	if v := os.Getenv("BSDOCK_TIMEZONE"); v != "" {
		cfg.Timezone = v
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
