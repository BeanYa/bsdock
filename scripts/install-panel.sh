#!/bin/bash
set -e

INSTALL_DIR="/opt/bsdock"
mkdir -p "$INSTALL_DIR"

if [[ ! -f "./panel" ]]; then
  echo "panel binary not found in current directory"
  exit 1
fi

cp ./panel "$INSTALL_DIR/panel"
cp ./config.yaml "$INSTALL_DIR/config.yaml" 2>/dev/null || true

cat > /etc/systemd/system/bsdock-panel.service <<EOF
[Unit]
Description=BSDock Panel
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/panel
Restart=always
RestartSec=5
Environment="BSDOCK_ADMIN_USERNAME=${BSDOCK_ADMIN_USERNAME}"
Environment="BSDOCK_ADMIN_PASSWORD=${BSDOCK_ADMIN_PASSWORD}"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bsdock-panel
systemctl restart bsdock-panel

echo "Panel installed and started."
