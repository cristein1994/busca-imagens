#!/usr/bin/env bash
set -euo pipefail

SOCKS_PORT="${TOR_SOCKS_PORT:-9050}"
DATA_DIR="${TOR_DATA_DIR:-/var/lib/tor}"
LOG_FILE="${TOR_LOG_FILE:-/var/log/tor/notices.log}"

if curl -fsS --max-time 8 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://check.torproject.org/api/ip >/dev/null 2>&1; then
  echo "Tor already up on 127.0.0.1:${SOCKS_PORT}"
  exit 0
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "Starting Tor via docker compose..."
  docker compose up -d tor
  for i in $(seq 1 30); do
    if curl -fsS --max-time 5 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://check.torproject.org/api/ip >/dev/null 2>&1; then
      echo "Tor ready"
      exit 0
    fi
    sleep 2
  done
fi

if command -v tor >/dev/null 2>&1; then
  echo "Starting local Tor daemon..."
  sudo mkdir -p "$(dirname "$LOG_FILE")" "$DATA_DIR"
  sudo chown "$(id -u)":"$(id -g)" "$(dirname "$LOG_FILE")" 2>/dev/null || true
  if id debian-tor >/dev/null 2>&1; then
    sudo chown debian-tor:debian-tor "$DATA_DIR" "$(dirname "$LOG_FILE")" || true
    sudo -u debian-tor tor \
      --RunAsDaemon 1 \
      --SocksPort "127.0.0.1:${SOCKS_PORT}" \
      --DataDirectory "$DATA_DIR" \
      --Log "notice file ${LOG_FILE}" || true
  else
    tor \
      --RunAsDaemon 1 \
      --SocksPort "127.0.0.1:${SOCKS_PORT}" \
      --DataDirectory "${HOME}/.tor-data" \
      --Log "notice file ${HOME}/.tor-notices.log" || true
  fi
fi

for i in $(seq 1 30); do
  if curl -fsS --max-time 5 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://check.torproject.org/api/ip >/dev/null 2>&1; then
    echo "Tor ready on 127.0.0.1:${SOCKS_PORT}"
    exit 0
  fi
  sleep 2
done

echo "Failed to start Tor on port ${SOCKS_PORT}" >&2
exit 1
