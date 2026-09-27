# Playground DeepSeek

Playground local para conversar com a API da DeepSeek, pesquisar na web e guardar páginas e respostas.

## Funcionalidades

- Conversa com `deepseek-chat` ou `deepseek-reasoner`
- Modelfile editável (`SYSTEM` e `PARAMETER temperature`)
- Deep Search: monta consultas, busca na web, lê as páginas e pede a resposta à DeepSeek com as fontes
- Guarda web: salva páginas lidas e respostas em `data/library.json`
- A chave da API fica no servidor. O navegador não recebe esse valor

## Pré-requisitos

- Node.js 20+
- Chave em [platform.deepseek.com](https://platform.deepseek.com/)

## Executar

```bash
npm install
cp .env.example .env
```

Edite `.env`:

```bash
DEEPSEEK_API_KEY=sua_chave
```

```bash
npm run dev
```

Abra o endereço do terminal, em geral `http://localhost:5173`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento, com a API local |
| `npm run build` | Checagem de tipos e build |
| `npm run preview` | Serve o build com a mesma API |
| `npm run lint` | Lint com oxlint |

## Variáveis

| Variável | Descrição |
| --- | --- |
| `DEEPSEEK_API_KEY` | Chave da API DeepSeek |
| `DEEPSEEK_BASE_URL` | Opcional. O padrão é `https://api.deepseek.com` |

Sem a chave, a leitura de páginas e a busca web ainda funcionam. A síntese e a conversa precisam da chave.

## Deep Search

A busca usa resultados públicos do Bing (RSS), da Wikipédia e, quando disponível, do DuckDuckGo. As páginas são lidas no servidor e enviadas à DeepSeek junto com a pergunta. Endereços locais e de rede privada são recusados.

## Guarda web

Os itens ficam em `data/library.json` nesta máquina. Esse arquivo não entra no git.
