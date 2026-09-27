#!/usr/bin/env bash
set -euo pipefail

SOCKS_PORT="${TOR_SOCKS_PORT:-9050}"
HOST="${TOR_SOCKS_HOST:-127.0.0.1}"

echo "Checking Tor SOCKS at ${HOST}:${SOCKS_PORT}..."
RESP="$(curl -fsS --max-time 20 --socks5-hostname "${HOST}:${SOCKS_PORT}" https://check.torproject.org/api/ip)"
echo "$RESP"
echo "$RESP" | grep -q '"IsTor":true' && echo "OK: traffic exits via Tor" || {
  echo "WARN: IsTor is not true" >&2
  exit 1
}
