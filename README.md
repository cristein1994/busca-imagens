# PULSE — reprodução completa (estilo Grabify) sempre online

Self-hosted: short link + image logger + smart logger + dashboard SSE + SQLite + Docker 24/7.

## O que foi reproduzido

| Recurso Grabify | PULSE |
|-----------------|-------|
| Create / Track URL | `/` + `/l/CODIGO` |
| Smart Logger | página intermediária + `/api/links/CODIGO/hit` |
| Image logger | `/i/CODIGO` (pixel GIF) |
| Dashboard / tracking page | `/d/CODIGO?token=...` ao vivo (SSE) |
| Features list | `/features` |
| IP Lookup | `/tools/ip` |
| URL Expander | `/tools/expand` |
| VPN/Proxy/Tor | via ip-api |
| Browser/OS/Device/Bot | parse de User-Agent |

Campos de log: Date/Time, IP, Local IP, Country/Region/City, ISP, Hostname, Timezone, Language, Browser, OS, Device, Bot, Screen, Orientation, Connection, Battery, Charging, GPU, Incognito, AdBlocker, VPN/Proxy, Tor, VM, Referer, User-Agent, Source.

## Rodar local

```bash
cp .env.example .env
npm install
npm run dev
```

## Sempre online (VPS)

```bash
export NEXT_PUBLIC_BASE_URL=https://seu-dominio.com
docker compose up -d --build
```

## Fluxo

1. Crie o monitor na home (Smart Logger on/off)
2. Envie `/l/CODIGO` **ou** embuta `<img src="/i/CODIGO">`
3. Abra o dashboard e deixe aberto — cliques entram ao vivo

## Aviso

Use só com base legal / consentimento. Não use para phishing nem para disfarçar rastreio como conteúdo de terceiros.
