#!/usr/bin/env bash
#
# Automates steps 2, 3, and 7 of docs/OUTPOST_SETUP.md on the Outpost itself
# (a Pi, a mini PC, any Linux box). Run this ON THE DEVICE, not on your laptop.
#
# What it does NOT do: register the camera in the web app (step 4) - you
# need the device key from there before this script can start the agent.
#
# Usage:
#   ./setup.sh --key YOUR_DEVICE_KEY --server https://your-backend-url [--yolo] [--service]
#
#   --yolo      also install ultralytics for object detection (person/vehicle/
#               package/animal), not just plain motion detection
#   --service   install and start the systemd service so it survives reboots
#               (asks for sudo)

set -euo pipefail

YOLO=0
INSTALL_SERVICE=0
DEVICE_KEY=""
SERVER_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --key) DEVICE_KEY="$2"; shift 2 ;;
    --server) SERVER_URL="$2"; shift 2 ;;
    --yolo) YOLO=1; shift ;;
    --service) INSTALL_SERVICE=1; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$DEVICE_KEY" || -z "$SERVER_URL" ]]; then
  echo "Usage: ./setup.sh --key YOUR_DEVICE_KEY --server https://your-backend-url [--yolo] [--service]"
  echo
  echo "Get the device key from the Settings page after adding this camera -"
  echo "it's shown once, right there. See docs/OUTPOST_SETUP.md step 4."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "== Installing system dependencies =="
if command -v apt >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y python3-opencv python3-pip
else
  echo "No apt here - install python3, OpenCV, and pip for your distro manually, then re-run."
  exit 1
fi

echo
echo "== Installing Python dependencies =="
pip3 install --user -r requirements.txt

if [[ "$YOLO" == "1" ]]; then
  echo
  echo "== Installing ultralytics (YOLOv8 object detection) =="
  echo "This can take a few minutes on a Pi - it's a real ML library, not a small one."
  pip3 install --user ultralytics
fi

if [[ "$INSTALL_SERVICE" == "1" ]]; then
  echo
  echo "== Installing the systemd service =="
  RUN_AS_USER="$(whoami)"
  YOLO_FLAG=""
  [[ "$YOLO" == "1" ]] || YOLO_FLAG="--no-yolo"

  SERVICE_FILE="/etc/systemd/system/sentry.service"
  sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Sentry Outpost camera agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_AS_USER}
WorkingDirectory=${SCRIPT_DIR}
ExecStart=/usr/bin/python3 ${SCRIPT_DIR}/outpost_agent.py --key ${DEVICE_KEY} --server ${SERVER_URL} ${YOLO_FLAG}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable sentry
  sudo systemctl start sentry

  echo
  echo "Service installed and started. Check it with:"
  echo "  sudo systemctl status sentry"
  echo "  journalctl -u sentry -f"
else
  echo
  echo "Setup done. Start the agent with:"
  echo "  python3 outpost_agent.py --key ${DEVICE_KEY} --server ${SERVER_URL}$( [[ "$YOLO" == "0" ]] && echo ' --no-yolo' )"
  echo
  echo "Once you've confirmed it works, re-run this script with --service to"
  echo "make it survive a reboot."
fi
