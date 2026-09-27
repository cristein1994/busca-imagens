# RODE

Terminal do Grok. A mesma sessão vale no shell e no navegador.

O cliente fala com a [Responses API](https://docs.x.ai/docs/guides/chat) da xAI (`grok-4.7` por padrão) e imprime o texto conforme chega. A chave fica no `.env` e não vai para o browser.

## O que dá para fazer

- Sessão interativa: `rode`
- Uma pergunta: `rode -p "texto"` ou `echo texto | rode`
- Terminal web: `npm run dev` ou `rode serve`
- Troca de modelo, prompt de sistema, histórico e busca (`web_search` + `x_search`)

## Comandos da sessão

| Comando | Efeito |
| --- | --- |
| `/help` | lista os comandos |
| `/model <id>` | troca o modelo e reinicia o fio |
| `/models` | modelos conhecidos |
| `/system <texto>` | prompt de sistema e reinicia o fio |
| `/search on` \| `/search off` | liga ou desliga busca na API |
| `/clear` | zera a conversa |
| `/history` | mostra o fio |
| `/exit` | encerra o processo no shell |

No navegador, Enter envia. Shift+Enter quebra a linha. Seta para cima recupera o que você já enviou.

## Como rodar

```bash
npm install
cp .env.example .env
# edite .env e defina XAI_API_KEY

npm run rode
# ou o binário local, depois do install:
npx rode

npm run dev
# http://127.0.0.1:5173
```

A sessão fica em `data/rode-session.json` (não entra no git). O fio seguinte reusa o id da resposta na xAI. `/clear`, `/model` e `/system` começam um fio novo.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run rode` | CLI |
| `npm run dev` | terminal web com Vite |
| `npm run build` | typecheck e build estático |
| `npm start` | serve o build |
| `npm test` | parser SSE, comandos e stream falso |
| `npm run lint` | oxlint |

## Flags

```text
rode -p "texto" --model grok-3-mini
rode --fresh -p "texto"     # ignora o fio anterior
rode --search -p "notícias" # web_search e x_search
rode inspect
rode serve --port 4173
```
