#!/usr/bin/env bash
set -euo pipefail

SOCKS_PORT="${TOR_SOCKS_PORT:-9050}"
DATA_DIR="${TOR_DATA_DIR:-$HOME/.tor-data-darkgpt}"
LOG_FILE="${TOR_LOG_FILE:-$HOME/.tor-notices-darkgpt.log}"

if curl -fsS --max-time 8 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://check.torproject.org/api/ip >/dev/null 2>&1; then
  echo "Tor already up on 127.0.0.1:${SOCKS_PORT}"
  exit 0
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "Starting Tor via docker compose..."
  docker compose up -d tor
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 5 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://check.torproject.org/api/ip >/dev/null 2>&1; then
      echo "Tor ready"
      exit 0
    fi
    sleep 2
  done
fi

if command -v tor >/dev/null 2>&1; then
  echo "Starting local Tor daemon..."
  mkdir -p "$DATA_DIR"
  tor \
    --RunAsDaemon 1 \
    --SocksPort "127.0.0.1:${SOCKS_PORT}" \
    --DataDirectory "$DATA_DIR" \
    --Log "notice file ${LOG_FILE}" || true
fi

for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 --socks5-hostname "127.0.0.1:${SOCKS_PORT}" https://check.torproject.org/api/ip >/dev/null 2>&1; then
    echo "Tor ready on 127.0.0.1:${SOCKS_PORT}"
    exit 0
  fi
  sleep 2
done

echo "Failed to start Tor on port ${SOCKS_PORT}" >&2
exit 1
