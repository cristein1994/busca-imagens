# CHROMA Studio

Runner do **Lodestones Chroma1-HD** (8.9B, Apache 2.0) — modelo text-to-image derivado do **FLUX.1-schnell** com modificações arquiteturais.

## Por que via Hugging Face Space?

Esta VM de Cloud Agent **não tem GPU** e só tem ~5 GB de RAM livre. Carregar Chroma1-HD + T5-XXL localmente não cabe. A API em `server/` encaminha a geração para Spaces públicos que hospedam `lodestones/Chroma1-HD`.

> Pollinations `model=chroma` **não** é o Chroma da Lodestones (cai no fallback `sana`). Aqui usamos o modelo real.

## Stack

- Vite + React 19 + TypeScript (UI)
- FastAPI + `gradio_client` (proxy de inferência)
- Modelo: [lodestones/Chroma1-HD](https://huggingface.co/lodestones/Chroma1-HD)

## Como rodar

```bash
# deps
npm install
pip3 install -r server/requirements.txt

# API (porta 8787)
npm run dev:api

# UI (porta 5173) — em outro terminal
npm run dev
```

Abra `http://localhost:5173`.

### Gerar demo CLI

```bash
python3 scripts/generate_demo.py
```

## Variáveis

Veja `.env.example`:

- `CHROMA_SPACES` — lista de Spaces (padrão: `NikAgs/Chroma1-HD,fantasticstar/Chroma1-HD`)

## Detalhes do modelo

| Item | Valor |
|------|--------|
| Parâmetros | 8.9B |
| Base | FLUX.1-schnell (modificado) |
| Licença | Apache 2.0 |
| Equipe | Lodestones |
| Pipeline | `diffusers.ChromaPipeline` / ComfyUI |

## Licença

Código deste playground: uso pessoal / demo. Pesos do modelo: Apache 2.0 (Lodestones).
