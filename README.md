# AgentEngine OSINT

Busca OSINT em duas faixas: a web de superfície e o índice público da dark web. Cada faixa raspa os resultados e monta um resumo extrativo. O piso é **30 resultados** por faixa quando a fonte tem material suficiente.

A interface está em português.

## O que cada faixa faz

| Faixa | Fonte | O que é raspado |
| --- | --- | --- |
| Superfície | [DuckDuckGo HTML](https://html.duckduckgo.com/html/), e se ainda faltarem resultados o RSS do Google News e a API da Wikipedia | Título, URL, snippet e, nas primeiras páginas, o texto legível (meta description e parágrafos) |
| Dark | Índice [Ahmia](https://ahmia.fi/) via SOCKS do Tor | Título, descrição, endereço `.onion` e data de visita do índice |

Não baixa o corpo das páginas `.onion`. A faixa dark só raspa o índice público, e só com o proxy Tor aberto.

## Tor (`systemctl`)

O pacote Ubuntu expõe dois units:

- `tor.service` — unit mestre (`Type=oneshot`)
- `tor@default.service` — daemon. O `ExecStart` usa `/usr/share/tor/tor-service-defaults-torrc`, que já define `SocksPort 9050`

```bash
sudo bash scripts/configure-tor.sh
```

O script roda `systemctl enable tor` e `systemctl start tor` / `tor@default`. Se o host não tiver bus systemd (container sem PID 1 systemd), ele sobe o mesmo `ExecStart` de `tor@default` com `--RunAsDaemon 1` e espera o `SocksPort 9050`.

No app, o painel **systemctl tor** mostra o estado e o botão **Configurar Tor** chama `POST /api/tor` (só a partir de localhost).

## Executar

```bash
npm install
cp .env.example .env.local
npm run tor:configure
npm run dev
```

Abra `http://localhost:3000`. Escolha Superfície, Dark ou As duas, e envie a consulta.

O quadro LabFert fica em `http://localhost:3000/labfert`. Ele organiza a planilha colada (nome, cargo, cidade, e-mail, LinkedIn) e cruza a cidade com as unidades publicadas em [labfert.agr.br/unidades](https://labfert.agr.br/unidades). E-mails individuais só aparecem quando já vinham na planilha. Links `ACw…` ficam marcados como identificador interno.

## Variáveis

| Variável | Padrão | Função |
| --- | --- | --- |
| `TOR_SOCKS_URL` | `socks5h://127.0.0.1:9050` | Proxy SOCKS com DNS remoto (necessário para `.onion`) |
| `OSINT_MIN_RESULTS` | `30` | Piso de resultados únicos por faixa |

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | Next.js em desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Parsers e resumo |
| `npm run lint` | oxlint |
| `npm run tor:configure` | `systemctl enable/start` do Tor |

## Stack

Next.js, TypeScript, Tailwind CSS. Sem chave de API: a superfície usa o HTML público do DuckDuckGo e a dark usa o índice Ahmia através do Tor local.
