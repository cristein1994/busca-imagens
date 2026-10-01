# PULSE — monitor de links sempre online

App próprio (equivalente ao fluxo Grabify) para criar um link de rastreio, enviar, e acompanhar cliques **em tempo real** com dashboard SSE + SQLite persistente.

## O que faz

1. Você cola a URL de destino e cria o monitor
2. Recebe dois links:
   - **Link para enviar** → `/l/CODIGO` (quem clica é redirecionado e logado)
   - **Dashboard** → `/d/CODIGO?token=...` (só você; atualiza sozinho)
3. Cada clique registra: IP, país/cidade aproximados, ISP, referer, user-agent, idioma, horário UTC
4. Com Docker (`restart: unless-stopped`) o serviço fica 24/7

## Stack

- Next.js 15 (App Router) + TypeScript
- SQLite (`better-sqlite3`) em `DATA_DIR`
- Server-Sent Events para live feed
- Geo lookup via `ip-api.com` (sem API key)

## Rodar local

```bash
cp .env.example .env
npm install
npm run dev
```

Abra http://localhost:3000

## Sempre online (Docker / VPS)

```bash
# Defina a URL pública do servidor (IP ou domínio)
export NEXT_PUBLIC_BASE_URL=https://seu-dominio.com

docker compose up -d --build
```

- App: porta `3000`
- Dados: volume `pulse_data` → `/data/pulse.db`
- Reinicia sozinho se o host cair (`restart: unless-stopped`)

## API rápida

```bash
# Criar link
curl -s -X POST http://localhost:3000/api/links \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com","label":"teste"}'

# Ver logs (precisa do token)
curl -s "http://localhost:3000/api/links/CODIGO?token=TOKEN"
```

## Variáveis

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_BASE_URL` | URL pública usada nos links gerados |
| `DATA_DIR` | Pasta do SQLite (default `./data`, Docker `/data`) |

## Aviso

Use apenas com consentimento / para seus próprios links e campanhas. Logging de IP de terceiros sem base legal pode violar LGPD e leis locais.
