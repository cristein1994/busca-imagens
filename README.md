# ORBE — motor de busca OSINT

Motor de busca que cruza **fontes públicas** e guarda os casos no navegador.

Consulta DNS, RDAP, transparência de certificados (crt.sh), Wayback Machine, página HTTP, `security.txt`, geolocalização de IP público, Gravatar, GitHub, perfis abertos (GitLab, Reddit, DEV, Keybase, Mastodon, Docker Hub, Hugging Face, Codeberg, Bluesky, npm), Wikipédia, DuckDuckGo Instant Answer e Hacker News.

`/sur termo` (ou o tipo **Surface**) procura páginas indexadas da surface web: título, site, trecho e URL.

`/deep termo` (ou o tipo **Deep**) varre mais de 30 diretórios públicos: fóruns (Hacker News, Stack Exchange, Lemmy, Discourse), catálogos de dados (OpenAlex, Crossref, PubMed, Zenodo, data.europa.eu, Library of Congress, NVD e outros), registos de código e mídia. A resposta traz os registos e a cobertura de cada diretório.

O tipo da consulta é detetado automaticamente (domínio, IP, e-mail, usuário, URL, telefone ou termo) e pode ser forçado na interface.

Telefone e termo livre usam só menções em fontes públicas. Endereços privados, loopback e metadados de nuvem não são consultados fora da máquina.

## Stack

- Next.js + TypeScript + Tailwind CSS
- API em `POST /api/search`
- Casos em `localStorage` (nada é enviado para uma base deste projeto)

## Arranque

```bash
npm install
cp .env.example .env   # opcional
npm run dev
```

Abra o endereço indicado no terminal (por omissão `http://localhost:3000`).

## API

```bash
curl -s -X POST http://localhost:3000/api/search \
  -H 'content-type: application/json' \
  -d '{"query":"example.com"}'
```

Corpo:

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `query` | sim | 2 a 180 caracteres |
| `kind` | não | `domain`, `ip`, `email`, `username`, `url`, `phone`, `keyword`, `surface` ou `deep` |

`/sur linux kernel` equivale a `kind: "surface"`. `/deep linux` equivale a `kind: "deep"`.

A resposta traz `kind`, `tookMs` e `modules` (estado `ok`, `empty` ou `error`, factos e tabelas).

Há um limite de 20 pedidos por minuto por cliente.

## Variáveis

| Variável | Descrição |
| --- | --- |
| `GITHUB_TOKEN` | Opcional. Aumenta a cota da API pública do GitHub. Só é lida no servidor. |

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build |
| `npm run lint` | Lint com oxlint |

## Casos

Na busca, **Guardar caso** grava título, notas e o instantâneo JSON. A página **Casos** lê o mesmo `localStorage`, permite editar notas, apagar e exportar. Os dois ecrãs mantêm a lista sincronizada no mesmo browser.
