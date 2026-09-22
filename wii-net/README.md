# COS-CURSOR. build.

# Wii Net · Rede Watch

Monitor local de IPs e dispositivos na LAN (projeto **wii** · Michel Silva).

Interface em **português (pt-BR)**. Stack: Next.js + TypeScript + Tailwind.

## O que faz

- Lista interfaces IPv4 **privadas** da máquina onde o app está rodando
- Varre o CIDR local (ping ICMP + tabela ARP do Linux + DNS reverso)
- Dashboard com status online/offline, último visto, hostname e MAC
- APIs REST para status e varredura — **somente CIDR local/privado** (RFC1918, link-local, loopback)

> **Importante:** o Wii Net precisa rodar **na máquina que está na rede alvo**. Em nuvem/container sem acesso à LAN, a lista de interfaces pode ficar vazia ou incompleta.

## Pré-requisitos

- Node.js 18+
- Linux recomendado (usa `/proc/net/arp` e `ping`)
- Permissão para enviar ICMP (em alguns ambientes pode ser necessário `CAP_NET_RAW` ou rodar sem bloqueio de ping)

## Instalação e execução

```bash
cd wii-net
npm install
cp .env.example .env   # opcional
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build |
| `npm run lint` | ESLint |

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `SCAN_MAX_HOSTS` | (reservado) limite de hosts por varredura — padrão no código: 1024 |

Veja `.env.example`.

## API

### `GET /api/interfaces`

Lista interfaces IPv4 privadas com CIDR sugerido.

### `GET /api/status`

Estado atual: interfaces, CIDR monitorado, dispositivos e última varredura.

### `POST /api/scan`

Inicia varredura. Body JSON opcional:

```json
{ "cidr": "192.168.1.0/24", "interfaceName": "eth0" }
```

Rejeita CIDRs públicos ou fora de redes privadas. Se omitido, usa a interface privada padrão detectada.

## Segurança

- Sem varredura de redes externas / IPs públicos
- Prefixos aceitos apenas entre `/8` e `/30`, com teto de hosts por varredura
- Destinado a monitoramento da **sua** LAN

## Estrutura

```
wii-net/
  src/app/api/          # interfaces, status, scan
  src/lib/              # network, scanner, monitor
  src/components/       # Dashboard (pt-BR)
```

## Licença

Projeto de demonstração do ecossistema wii.
