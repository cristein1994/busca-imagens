# RAIZ — Consulta CNPJ

SPA/Next.js para consultar CNPJ na base pública da Receita Federal via [BrasilAPI](https://brasilapi.com.br/).

## Funcionalidades

- Máscara e validação de dígitos verificadores (módulo 11)
- Consulta de razão social, fantasia, situação, natureza, porte, capital
- CNAE principal e secundários
- Endereço, telefone, e-mail
- QSA (quadro de sócios e administradores)
- API route interna `GET /api/cnpj/[cnpj]` (proxy para BrasilAPI)

## Pré-requisitos

- Node.js 18+

## Instalação e execução

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build |
| `npm test` | Testes de validação de CNPJ |

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `BRASIL_API_BASE` | Opcional. Default: `https://brasilapi.com.br/api` |

Nenhuma chave de API é necessária.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- BrasilAPI CNPJ v1

## Exemplo

CNPJ de teste conhecido: `33.000.167/0001-01` (Petrobras).

## Limitações

- Depende da disponibilidade da BrasilAPI
- QSA reflete o quadro atual público, não histórico completo

## Licença

Projeto de demonstração. Respeite os termos das fontes de dados públicas.
