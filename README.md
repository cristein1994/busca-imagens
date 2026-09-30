# LINHA — OSINT de números de telefone

Mesa de investigação para telefones com **fontes públicas**: validação E.164, tipo de linha, DDD brasileiro (ANATEL) e deep links para motores de busca / diretórios abertos.

## O que faz

- Normaliza números BR (`11999999999` → `+5511999999999`) e internacionais
- Mostra formato E.164, nacional, internacional, país e tipo (móvel/fixo/VoIP…)
- Mapeia DDD → UF, região e cidades principais
- Abre buscas em Google, DuckDuckGo, Bing, Yandex, Brave, GitHub, Reddit, Pastebin
- Deep links WhatsApp (`wa.me`) e Telegram
- Diretórios públicos: Truecaller Web, NumLookup, CallApp, tabela ANATEL
- Guarda casos + notas em `localStorage` (não envia para servidor deste projeto)
- Carrier opcional via [AbstractAPI Phone Validation](https://www.abstractapi.com/phone-validation-api)

## O que não faz

- Não consulta bases de breach, dark web, HLR privado nem assinante da operadora
- Não burla login / paywall de diretórios

## Arranque

```bash
npm install
cp .env.example .env   # opcional — só se for usar AbstractAPI
npm run dev
```

Abra o endereço do Vite (em geral `http://localhost:5173`).

## Variáveis

| Variável | Descrição |
| --- | --- |
| `VITE_ABSTRACT_PHONE_KEY` | Opcional. Chave AbstractAPI para dica de operadora |

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Build produção |
| `npm run preview` | Preview do build |
| `npm run lint` | oxlint |

## Stack

Vite + React 19 + TypeScript + `libphonenumber-js`

## Uso rápido

1. Cole `+5511999999999` ou `11999999999`
2. Clique **Investigar**
3. Use os portais públicos / guarde o caso com notas
4. (Opcional) **Consultar carrier** se a chave AbstractAPI estiver configurada
