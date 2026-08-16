#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)

function get_header() {
  cat << "EOF"
  _____                  ____          _ _             __  __           _      _     
 |  ___| __ ___  ___    / ___|___   __| (_)_ __   __ _|  \/  | ___   __| | ___| |___ 
 | |_ | '__/ _ \/ _ \  | |   / _ \ / _` | | '_ \ / _` | |\/| |/ _ \ / _` |/ _ \ / __|
 |  _|| | |  __/  __/  | |__| (_) | (_| | | | | | (_| | |  | | (_) | (_| |  __/ \__ \
 |_|  |_|  \___|\___|   \____\___/ \__,_|_|_| |_|\__, |_|  |_|\___/ \__,_|\___|_|___/
                                                 |___/                               
EOF
}

# Copyright (c) 2021-2026 lehneres
# Author: lehneres (https://github.com/lehneres)
# License: MIT | https://github.com/vava-nessa/free-coding-models/raw/main/LICENSE
# Source: https://github.com/vava-nessa/free-coding-models

APP="Free Coding Models"
var_tags="${var_tags:-ai;router}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-2048}"
var_disk="${var_disk:-8}"
var_os="${var_os:-debian}"
var_version="${var_version:-12}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
# Override var_install to point to our local script via path traversal trick
var_install="../../../../vava-nessa/free-coding-models/main/scripts/proxmoxve-install"
color
catch_errors

function update_script() {
  header_info
  if command -v pct >/dev/null 2>&1; then
    check_container_storage
    check_container_resources
    if ! pct exec "$CTID" -- [ -d /opt/free-coding-models ]; then
      msg_error "No ${APP} Installation Found in CT ${CTID}!"
      exit
    fi
    msg_info "Updating ${APP} in CT ${CTID}..."
    pct exec "$CTID" -- bash -c "cd /opt/free-coding-models && git checkout . && git pull && npm install --include=dev && npm run build:web && systemctl restart fcm-web"
    pct exec "$CTID" -- bash -c "echo 'echo \"Updating Free Coding Models...\"; cd /opt/free-coding-models && git checkout . && git pull && npm install --include=dev && npm run build:web && systemctl restart fcm-web; echo \"Updated successfully\"' >/usr/bin/update && chmod +x /usr/bin/update"
    msg_ok "Updated successfully"
  else
    if [ ! -d /opt/free-coding-models ]; then
      msg_error "No ${APP} Installation Found!"
      exit
    fi
    msg_info "Updating ${APP}..."
    cd /opt/free-coding-models && git checkout . && git pull && npm install --include=dev && npm run build:web && systemctl restart fcm-web
    msg_ok "Updated successfully"
  fi
  exit
}

if [[ "$1" == "update" ]]; then
  CTID=${2:-500}
  update_script
fi

start
build_container
description

msg_ok "Completed successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW}Access it using the following URL:${CL}"
echo -e "${GATEWAY}${BGN}http://${IP}:19280${CL}"
echo ""
echo -e "${YW}Next steps:${CL}"
echo "  1. pct enter $CTID"
echo "  2. Edit /root/.free-coding-models.json and add your API keys"
echo "  3. systemctl restart fcm-web"
echo ""
