# LINCE — Combo OSINT público

Busca em fontes **públicas** da surface web + organizador de arquivos **locais** + **dashboard** com filtros e histórico.

> Escopo deliberado: **sem** Deep Web, Tor, .onion, mercados ou dumps de credenciais.

## Módulos

1. **Busca pública** (`/buscar`) — Wikipedia (pt), DuckDuckGo Instant Answer, Open Library
2. **Arquivos locais** (`/arquivos`) — import CSV/JSON/TXT, tags, notas, busca no navegador (localStorage)
3. **Dashboard** (`/dashboard`) — filtros por texto/tag/data/fonte + histórico unificado

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- React 19
- Zod na API de busca

## Instalação

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Dev server na porta 3000 |
| `npm run build` | Build de produção |
| `npm start` | Serve o build |
| `npm run lint` | Lint Next.js |

## Sample data

Arquivos de exemplo em `data/samples/`:

- `contatos-publicos.csv`
- `fontes.json`

Importe-os em **Arquivos locais** para testar o organizador.

## Privacidade

- Resultados de busca e histórico ficam no `localStorage` do navegador.
- Arquivos importados **não** são enviados a um servidor próprio (só parse no client).
- A rota `/api/search` só consulta APIs públicas de terceiros.

## Licença

Projeto de demonstração. Respeite os termos das APIs consultadas.
