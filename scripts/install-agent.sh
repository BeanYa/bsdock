#!/bin/bash
set -e

PANEL_URL=""
TOKEN=""
MODE="auto"
INSECURE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --panel) PANEL_URL="$2"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --insecure) INSECURE="true"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$PANEL_URL" || -z "$TOKEN" ]]; then
  echo "Usage: $0 --panel <url> --token <token> [--mode auto|websocket|http|pull] [--insecure]"
  exit 1
fi

ARCH=$(uname -m)
case "$ARCH" in
  x86_64) BIN_ARCH="amd64" ;;
  aarch64|arm64) BIN_ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

INSTALL_DIR="/opt/bsdock-agent"
BIN_NAME="bsdock-agent-linux-${BIN_ARCH}"
BIN_URL="${PANEL_URL}/static/agent/${BIN_NAME}"

mkdir -p "$INSTALL_DIR"
echo "Downloading agent from $BIN_URL ..."
curl -fsSL "$BIN_URL" -o "${INSTALL_DIR}/bsdock-agent"
chmod +x "${INSTALL_DIR}/bsdock-agent"

cat > /etc/systemd/system/bsdock-agent.service <<EOF
[Unit]
Description=BSDock Agent
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/bsdock-agent --panel "$PANEL_URL" --token "$TOKEN" --mode "$MODE"$([ "$INSECURE" = "true" ] && echo " --insecure")
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bsdock-agent
systemctl restart bsdock-agent

echo "Agent installed and started."
