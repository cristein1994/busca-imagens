#!/usr/bin/env bash
# Enable the distro Tor units and make SocksPort 9050 accept connections.
# On a host with systemd this is: systemctl enable --now tor
# tor.service is the master unit; tor@default.service is the daemon
# (ExecStart uses /usr/share/tor/tor-service-defaults-torrc, SocksPort 9050).
# When PID 1 is not systemd, the same ExecStart is daemonized after enable fails.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "execute como root: sudo bash scripts/configure-tor.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

if ! command -v tor >/dev/null 2>&1; then
  apt-get update
  apt-get install -y tor
fi

if ! id debian-tor >/dev/null 2>&1; then
  echo "usuário debian-tor ausente após instalar o pacote tor" >&2
  exit 1
fi

install -d -m 02755 -o debian-tor -g debian-tor /run/tor
install -d -m 02700 -o debian-tor -g debian-tor /var/lib/tor
install -d -m 02750 -o debian-tor -g debian-tor /var/log/tor

TORRC=/etc/tor/torrc
MARKER='AgentEngine OSINT'
if [[ -f "$TORRC" ]] && ! grep -q "$MARKER" "$TORRC"; then
  cat >> "$TORRC" <<'EOF'

## AgentEngine OSINT
## SocksPort 9050 vem de /usr/share/tor/tor-service-defaults-torrc
## (não repetir SocksPort aqui — duas linhas iguais derrubam o boot).
##   systemctl enable --now tor
##   systemctl start tor@default
##   systemctl status tor@default --no-pager
Log notice file /var/log/tor/notices.log
EOF
fi

echo "systemctl enable tor"
set +e
systemctl enable tor
ENABLE_RC=$?
systemctl enable tor@default
ENABLE_DEFAULT_RC=$?
set -e
echo "systemctl enable tor → ${ENABLE_RC}; tor@default → ${ENABLE_DEFAULT_RC}"

port_open() {
  timeout 1 bash -c 'echo >/dev/tcp/127.0.0.1/9050' >/dev/null 2>&1
}

if port_open; then
  echo "SocksPort 9050 já aceita conexões"
  exit 0
fi

echo "systemctl start tor"
set +e
systemctl start tor
systemctl start tor@default
sleep 1
systemctl is-active tor@default
set -e

if port_open; then
  echo "tor@default ativo via systemctl"
  exit 0
fi

echo "systemctl não subiu o daemon (sem bus systemd, ou policy-rc.d). ExecStart de tor@default em modo daemon."

if [[ -f /run/tor/tor.pid ]]; then
  old="$(cat /run/tor/tor.pid 2>/dev/null || true)"
  if [[ -n "${old}" ]] && kill -0 "${old}" 2>/dev/null; then
    echo "processo tor pid=${old} existe, mas o SOCKS ainda não abriu"
  fi
fi

/usr/bin/tor \
  --defaults-torrc /usr/share/tor/tor-service-defaults-torrc \
  -f /etc/tor/torrc \
  --verify-config

/usr/bin/tor \
  --defaults-torrc /usr/share/tor/tor-service-defaults-torrc \
  -f /etc/tor/torrc \
  --RunAsDaemon 1

for _ in $(seq 1 50); do
  if grep -q "Bootstrapped 100%" /var/log/tor/notices.log 2>/dev/null; then
    echo "Bootstrapped 100%"
    exit 0
  fi
  if port_open && grep -q "Bootstrapped" /var/log/tor/notices.log 2>/dev/null; then
    :
  fi
  sleep 1
done

if port_open; then
  echo "SocksPort 9050 aberto; bootstrap ainda em andamento. Veja /var/log/tor/notices.log"
  exit 0
fi

echo "Tor não abriu o SocksPort 9050. Últimas linhas do log:" >&2
tail -n 30 /var/log/tor/notices.log >&2 || true
exit 1
