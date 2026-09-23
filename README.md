# Lente

Busca de fotos e vídeos por metadados ou pelo conteúdo descrito no arquivo. A consulta vira um dork e sai para 32 motores da surface e 10 endpoints onion.

## O que faz

- Modo **metadados**: `filetype`, `intitle`, `inurl`, `site`, autor, câmera, resolução, codec e intervalo de datas.
- Modo **conteúdo**: o texto descreve o que aparece na foto ou no vídeo (título, legenda, transcrição, nome de arquivo) e a vertical de imagem ou vídeo entra na URL.
- Interruptor **18+** para resultado adulto. Material de abuso sexual infantil é recusado.
- Painel dos motores, com link para abrir a mesma busca em cada um.
- Onion passa pelo SOCKS do Tor. Sem Tor, Ahmia, Torch, DuckDuckGo, Brave e MetaGer usam o espelho clearnet e os índices só-onion ficam marcados como fora.
- Visor para imagem, arquivo de vídeo e embed conhecido (YouTube, Dailymotion, Vimeo, PeerTube).
- Download no próprio app quando a URL é o arquivo (`image/*` ou `video/*`), com teto de 200 MB.

## Rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Abra o endereço que o Vite mostrar, em geral `http://localhost:5173`.

Tor local, se quiser a prova em `.onion`:

```bash
# Debian/Ubuntu
sudo apt install tor
sudo service tor start
```

`TOR_SOCKS` aponta para o SOCKS (`socks5://` ou `socks5h://`). A porta padrão do serviço `tor` é `9050`. O nome `.onion` é enviado ao Tor, sem DNS local.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Vite com a API `/api` no mesmo processo |
| `npm run build` | Checagem TypeScript e build |
| `npm run preview` | Build servido com a mesma API |
| `npm run lint` | oxlint |

## API

| Rota | Uso |
| --- | --- |
| `GET /api/engines` | Catálogo |
| `GET /api/tor?probe=1` | Porta SOCKS; com `probe=1`, lê a Ahmia em `.onion` |
| `POST /api/search` | Fan-out da busca |
| `GET /api/inspect?url=` | Diz se a URL é arquivo de mídia |
| `GET /api/preview?url=` | Exibe o arquivo |
| `GET /api/download?url=` | Baixa o arquivo |

Endereços `.onion` de terceiros apodrecem. Os oficiais usados aqui são os publicados pela Ahmia, pelo Torch, pelo DuckDuckGo, pelo Brave e pelo MetaGer. Os outros cinco estão como aparecem em diretórios públicos e podem estar fora.
