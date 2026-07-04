package config

type Config struct {
	PanelURL string
	Token    string
	Mode     string // auto | websocket | http | pull
	Insecure bool
}
