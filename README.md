# HERETIC — GLM-4.7-Flash + Tor

Console local para rodar **GLM-4.7-Flash-heretic** (ThalisAI / Heretic abliteration) com ferramentas de internet saindo pela **rede Tor** (SOCKS5).

## O que inclui

- Chat UI (Next.js) com streaming SSE
- Backend agent com tools: `web_search`, `fetch_url`, `tor_status` (tudo via Tor)
- Scripts para subir Tor e puxar o modelo no Ollama
- `docker-compose` com Tor + Ollama

## Requisitos do modelo

| Quant | Disco | RAM/VRAM |
|-------|-------|----------|
| Q4_K_M (default) | ~17 GB | ~18 GB+ |
| Q6_K | ~23 GB | ~24 GB+ |
| Q8_0 | ~32 GB | ~34 GB+ |

GPU NVIDIA recomendada. CPU-only é possível só com muita RAM.

Modelo padrão:

```text
hf.co/ThalisAI/GLM-4.7-Flash-heretic:Q4_K_M
```

## Setup rápido

```bash
cp .env.example .env
npm install

# Tor (local ou docker)
npm run tor:start
npm run tor:check

# Ollama + modelo (máquina com RAM/GPU suficiente)
npm run model:pull
# ou: docker compose up -d && docker exec -it glm-ollama ollama pull hf.co/ThalisAI/GLM-4.7-Flash-heretic:Q4_K_M

npm run dev
```

Abra `http://localhost:3000`.

## Variáveis

| Var | Default |
|-----|---------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434/v1` |
| `OLLAMA_MODEL` | `hf.co/ThalisAI/GLM-4.7-Flash-heretic:Q4_K_M` |
| `TOR_SOCKS_HOST` | `127.0.0.1` |
| `TOR_SOCKS_PORT` | `9050` |
| `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL` | opcional, endpoint OpenAI-compatible remoto |

## Fluxo de rede

```text
Browser → Next.js /api/chat → Ollama (GLM heretic)
                              ↘ tools (search/fetch) → Tor SOCKS5 → clearnet exit
```

## Scripts

| Comando | Ação |
|---------|------|
| `npm run tor:start` | Sobe Tor (daemon ou compose) |
| `npm run tor:check` | Confirma `IsTor: true` |
| `npm run model:pull` | Instala Ollama (se preciso) e puxa o Heretic |
| `npm run stack:up` | `docker compose up -d` (tor + ollama) |
| `npm run dev` | UI + API em `:3000` |

## Licença

Demo operator console. O modelo Heretic é de terceiros (Hugging Face / ThalisAI); respeite os termos das fontes.
