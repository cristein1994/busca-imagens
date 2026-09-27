# TextoTube — YouTube em texto

Busque vídeos no YouTube e extraia legendas/transcrições em **texto corrido**.

## Funcionalidades

- Busca por termo no YouTube (via Apify `streamers/youtube-scraper`)
- Extração de legendas/transcrição em português (via `starvibe/youtube-video-transcript`, com fallback no scraper oficial)
- Painel de leitura com copiar texto
- UI em português, responsiva

## Pré-requisitos

- Node.js 18+
- Token Apify: [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations)

## Instalação

```bash
npm install
cp .env.example .env.local
# Edite .env.local e defina APIFY_TOKEN=...
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build |
| `npm run lint` | Lint Next.js |

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `APIFY_TOKEN` | Token da API Apify (obrigatório; só no servidor) |

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS 4
- `apify-client` nas rotas `/api/search` e `/api/transcript`

## Fluxo

1. `POST /api/search` → lista vídeos pela query
2. Clique em um resultado → `POST /api/transcript` → texto da legenda/transcrição

## Licença

Projeto de demonstração. Conteúdo do YouTube pertence aos respectivos criadores — use apenas dados públicos e respeite os termos de uso.
