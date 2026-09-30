# Nexus Capture

Analisador de tráfego de rede no navegador, com UI estilo Wireshark: lista de pacotes, árvore de protocolos, **mensagem decodificada**, hex dump, display filter e captura ao vivo simulada.

> Captura raw de interface Wi-Fi (monitor mode) exige root + hardware no host — o browser não tem acesso a isso. Esta app oferece o visualizador completo + simulador live + importação de arquivos `.pcap` reais exportados do Wireshark/`tcpdump`.

## Funcionalidades

- Painel de pacotes (No / Time / Source / Dest / Protocol / Length / Info) com cores por protocolo
- Detalhes em árvore (Ethernet, IP, TCP/UDP, DNS, HTTP, TLS, ARP, ICMP, 802.11/Radiotap)
- Painel **Message** com stream ao vivo + payload do pacote (HTTP, DNS, ARP…)
- Botão **Continuar** retoma a captura sem apagar o buffer
- Hex dump + ASCII
- Display filter: `tcp`, `dns`, `wlan`, `ip.addr == x`, `frame.len > 100`, `http contains Host`, `&&` / `||`
- Start/Stop captura simulada (Wi-Fi monitor, LAN, misto)
- Abrir arquivos `.pcap` (Libpcap clássico)
- Exportar pacotes filtrados em JSON
- Navegação por teclado: `j` / `k` ou setas

## Como usar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

1. Escolha a interface (ex.: `wlan0 (monitor)`)
2. Clique **Start** para ver tráfego ao vivo simulado
3. Ou **Open PCAP** com um dump real do Wireshark

### Gerar PCAP real no Linux (opcional)

```bash
# Com permissão adequada, na sua máquina:
sudo tcpdump -i wlan0 -w capture.pcap
# Depois abra capture.pcap neste app
```

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Lint (oxlint) |

## Stack

Vite + React 19 + TypeScript + CSS Modules

## Licença

Projeto de demonstração para análise de tráfego em redes que você administra.
