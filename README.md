# LINC SCRAPE

Scraper de **dados públicos do LinkedIn** (perfis, busca de pessoas, empresas e vagas) usando Actors da Apify Store.

Vite + React (UI) · Express + `apify-client` (API) · token só no servidor.

## O que scrapa

| Modo | Actor Apify |
|------|-------------|
| Perfis | `harvestapi/linkedin-profile-scraper` |
| Busca pessoas | `harvestapi/linkedin-profile-search` |
| Empresas | `harvestapi/linkedin-company` |
| Vagas | `curious_coder/linkedin-jobs-scraper` |

Não usa login/cookies do LinkedIn. Actors são pay-per-event na Apify (tier gratuito cobre testes pequenos).

## Setup

1. Copie o env e cole o token:

```bash
cp .env.example .env
# edite APIFY_TOKEN=apify_api_...
```

Token: [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations)

2. Instale e rode UI + API juntos:

```bash
npm install
npm run dev
```

- UI: `http://localhost:5173`
- API: `http://localhost:3001`

## API

```http
GET  /api/health
POST /api/scrape/profile
POST /api/scrape/search
POST /api/scrape/company
POST /api/scrape/jobs
```

### Exemplos

**Perfil**

```bash
curl -s http://localhost:3001/api/scrape/profile \
  -H 'content-type: application/json' \
  -d '{"queries":["https://www.linkedin.com/in/williamhgates"]}'
```

**Busca**

```bash
curl -s http://localhost:3001/api/scrape/search \
  -H 'content-type: application/json' \
  -d '{"searchQuery":"Software Engineer","locations":["Brazil"],"maxItems":10}'
```

**Empresa**

```bash
curl -s http://localhost:3001/api/scrape/company \
  -H 'content-type: application/json' \
  -d '{"companies":["https://www.linkedin.com/company/google"]}'
```

**Vagas**

```bash
curl -s http://localhost:3001/api/scrape/jobs \
  -H 'content-type: application/json' \
  -d '{"keywords":"react developer","location":"São Paulo, Brazil","maxItems":15}'
```

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Vite + API juntos |
| `npm run dev:web` | Só frontend |
| `npm run dev:api` | Só API |
| `npm run build` | Build de produção |
| `npm run lint` | Lint |

## Uso responsável

Use apenas dados públicos, respeite os Termos do LinkedIn e os limites de cobrança da Apify. O UI limita resultados (máx. 50) para controlar custo.

## Licença

Projeto de demonstração / uso pessoal.
