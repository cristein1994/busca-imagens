# COS-CURSOR. build.

# Wii Lua · Ateliê Lunar

Playground de **Lua 5.3** do projeto **wii** (Michel Silva).

Escreva no caderno, execute no servidor (VM [fengari](https://fengari.io/) — Lua em JavaScript, sem binário nativo) e leia a saída na luneta. Interface em **português (pt-BR)**.

## O que faz

- Editor Lua com destaque de sintaxe (Monaco)
- Execução local no processo Node (`POST /api/run`)
- Exemplos (constelações): olá, fatorial, tabelas, Fibonacci, FizzBuzz, padrões, fechamentos, metatable
- Painel de saída com `print`, valores de `return`, erros com número de linha
- Sandbox: abre só `base`, `string`, `table`, `math`, `utf8`, `coroutine` — sem `io`, `os`, `package`, `debug`
- Corte por contagem de instruções (loops infinitos viram timeout)
- Último código salvo no `localStorage`

## Instalação e execução

```bash
cd lua
npm install
cp .env.example .env.local   # opcional
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Atalho no caderno: **Ctrl+Enter** (ou **⌘ Enter** no Mac).

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build |
| `npm run lint` | ESLint |
| `npm run verify:runtime` | Smoke test do interpretador (sem Next) |

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `LUA_MAX_INSTRUCTIONS` | Teto de instruções por execução | `2000000` |
| `LUA_MAX_SOURCE_BYTES` | Tamanho máximo do código | `65536` |
| `PORT` | Porta do Next.js | `3000` |

Veja `.env.example`.

## API

### `GET /api/health`

Metadados do interpretador (versão, limites).

### `POST /api/run`

```json
{ "source": "print('olá')" }
```

Resposta:

```json
{
  "status": "ok",
  "stdout": ["olá"],
  "returns": [],
  "error": null,
  "line": null,
  "elapsedMs": 1.2,
  "instructionCount": 0,
  "runtime": "fengari",
  "luaVersion": "5.3"
}
```

`status`: `ok` | `error` | `timeout` | `invalid`.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Monaco Editor
- fengari (Lua 5.3)

## Licença

Projeto de demonstração / uso pessoal (família wii).
