# DarkGPT Playground

Console local estilo **DarkGPT**: chat com LLM OpenAI-compatible e tools de internet saindo pelo **Tor** (SOCKS5).

## O que inclui

- UI de chat com streaming SSE
- Agent com tools: `web_search`, `fetch_url`, `tor_status` (tudo via Tor)
- Backend no Vite middleware (chave/API só no servidor)
- Scripts Tor + `docker-compose` (Tor + Ollama)

## Fluxo

```text
Browser → Vite /api/chat → Ollama ou OpenAI-compatible
                         ↘ tools (search/fetch) → Tor SOCKS5 → clearnet exit
```

As tools usam a clearnet através do Tor (DuckDuckGo HTML, fetch http/https). Hosts locais/privados são bloqueados.

## Setup rápido

```bash
cp .env.example .env
npm install

# Tor
npm run tor:start
npm run tor:check

# Ollama (em outra máquina/terminal)
ollama serve
ollama pull llama3.2

npm run dev
```

Abra `http://localhost:5173`.

### API remota (opcional)

No `.env`:

```bash
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=meta-llama/llama-3.1-70b-instruct
```

Se `OPENAI_BASE_URL` + `OPENAI_API_KEY` estiverem definidos, eles têm prioridade sobre Ollama.

## Variáveis

| Var | Default |
|-----|---------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434/v1` |
| `OLLAMA_MODEL` | `llama3.2` |
| `TOR_SOCKS_HOST` | `127.0.0.1` |
| `TOR_SOCKS_PORT` | `9050` |
| `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL` | opcional |

## Scripts

| Comando | Ação |
|---------|------|
| `npm run tor:start` | Sobe Tor (docker ou daemon) |
| `npm run tor:check` | Confirma `IsTor: true` |
| `npm run stack:up` | `docker compose up -d` (tor + ollama) |
| `npm run dev` | UI + API em `:5173` |
| `npm run build` | Build de produção |
| `npm run lint` | oxlint |

## Stack

- Vite + React + TypeScript
- `socks-proxy-agent` para Tor
- Ollama ou qualquer endpoint OpenAI-compatible

## Licença

Demo playground. Modelos e APIs são de terceiros — respeite os termos de cada provedor.
