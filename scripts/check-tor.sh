#!/usr/bin/env bash
set -euo pipefail

SOCKS_PORT="${TOR_SOCKS_PORT:-9050}"
HOST="${TOR_SOCKS_HOST:-127.0.0.1}"

echo "Checking Tor at ${HOST}:${SOCKS_PORT}..."
RES="$(curl -fsS --max-time 20 --socks5-hostname "${HOST}:${SOCKS_PORT}" https://check.torproject.org/api/ip)"
echo "$RES"
echo "$RES" | grep -q '"IsTor":true' && echo "OK: traffic exits via Tor" || {
  echo "FAIL: not exiting via Tor" >&2
  exit 1
}
