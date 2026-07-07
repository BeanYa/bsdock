#!/bin/bash
set -e

PANEL_URL=""
TOKEN=""
MODE="auto"
INSECURE="false"
INSTANCE_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --panel) PANEL_URL="$2"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --insecure) INSECURE="true"; shift ;;
    --instance-id) INSTANCE_ID="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$PANEL_URL" || -z "$TOKEN" ]]; then
  echo "Usage: $0 --panel <url> --token <token> [--instance-id id] [--mode auto|websocket|http|pull] [--insecure]"
  exit 1
fi

ARCH=$(uname -m)
case "$ARCH" in
  x86_64) BIN_ARCH="amd64" ;;
  aarch64|arm64) BIN_ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

if [[ -z "$INSTANCE_ID" ]]; then
  INSTANCE_ID=$(printf '%s' "$PANEL_URL" | sha256sum | cut -c1-16)
fi
if [[ ! "$INSTANCE_ID" =~ ^[a-fA-F0-9]{8,64}$ ]]; then
  echo "Invalid instance id: $INSTANCE_ID" >&2
  exit 1
fi
INSTANCE_ID=$(printf '%s' "$INSTANCE_ID" | tr '[:upper:]' '[:lower:]')
INSTALL_DIR="/opt/bsdock-agent/${INSTANCE_ID}"
BIN_NAME="bsdock-agent-linux-${BIN_ARCH}"
BIN_URL="${PANEL_URL}/static/agent/${BIN_NAME}"
SERVICE_NAME="bsdock-agent-${INSTANCE_ID}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

LEGACY_SERVICE="/etc/systemd/system/bsdock-agent.service"
if [[ -f "$LEGACY_SERVICE" ]] && grep -qF -- "--panel $PANEL_URL" "$LEGACY_SERVICE"; then
  echo "Stopping legacy bsdock-agent service ..."
  if systemctl is-active --quiet bsdock-agent 2>/dev/null; then
    systemctl stop bsdock-agent
  fi
  systemctl disable bsdock-agent 2>/dev/null || true
  rm -f "$LEGACY_SERVICE"
fi

if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "Stopping existing $SERVICE_NAME service ..."
  systemctl stop "$SERVICE_NAME"
fi

mkdir -p "$INSTALL_DIR"
echo "Downloading agent from $BIN_URL ..."
curl -fsSL "$BIN_URL" -o "${INSTALL_DIR}/bsdock-agent"

# Validate that the downloaded file is a Linux ELF executable. If the panel URL
# points at the frontend dev server instead of the panel backend, the server may
# return an HTML fallback page that cannot be executed.
if [[ ! -f "${INSTALL_DIR}/bsdock-agent" ]]; then
  echo "Agent binary was not downloaded." >&2
  exit 1
fi
if [[ $(stat -c%s "${INSTALL_DIR}/bsdock-agent" 2>/dev/null || stat -f%z "${INSTALL_DIR}/bsdock-agent" 2>/dev/null || echo 0) -lt 4096 ]]; then
  echo "Downloaded agent binary is too small. Verify that --panel points to the panel backend (e.g. http://localhost:8080), not the frontend dev server." >&2
  exit 1
fi
if ! head -c 4 "${INSTALL_DIR}/bsdock-agent" | grep -q $'\x7fELF'; then
  echo "Downloaded file does not appear to be a valid Linux executable (missing ELF header). Verify that --panel points to the panel backend (e.g. http://localhost:8080), not the frontend dev server." >&2
  exit 1
fi

chmod +x "${INSTALL_DIR}/bsdock-agent"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=BSDock Agent (${PANEL_URL})
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
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "Agent installed and started as $SERVICE_NAME."
