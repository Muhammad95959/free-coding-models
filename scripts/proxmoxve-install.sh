#!/usr/bin/env bash

# Copyright (c) 2021-2026 lehneres
# Author: lehneres (https://github.com/lehneres)
# License: MIT | https://github.com/vava-nessa/free-coding-models/raw/main/LICENSE
# Source: https://github.com/vava-nessa/free-coding-models

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

msg_info "Installing Dependencies"
$STD apt install -y \
  git \
  ca-certificates \
  curl \
  imagemagick \
  make \
  g++
msg_ok "Installed Dependencies"

NODE_VERSION="22" setup_nodejs

msg_info "Installing Free Coding Models"
$STD git clone https://github.com/vava-nessa/free-coding-models.git /opt/free-coding-models
cd /opt/free-coding-models
$STD npm install --include=dev
$STD npm run build:web
msg_ok "Installed Free Coding Models"

msg_info "Creating Service"
cat <<EOF >/etc/systemd/system/fcm-web.service
[Unit]
Description=Free Coding Models Web Dashboard
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/free-coding-models
ExecStart=/usr/bin/node /opt/free-coding-models/bin/free-coding-models.js web
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=FCM_HOST=0.0.0.0
Environment=FCM_PORT=19280

[Install]
WantedBy=multi-user.target
EOF
systemctl enable -q --now fcm-web
msg_ok "Created Service"

motd_ssh
customize
echo 'echo "Updating Free Coding Models..."; cd /opt/free-coding-models && git checkout . && git pull && npm install --include=dev && npm run build:web && systemctl restart fcm-web; echo "Updated successfully"' >/usr/bin/update
cleanup_lxc
