# Clientes Local

Organizador **local** dos seus clientes (CSV/JSON). Busca por CPF, e-mail, telefone ou nome **só nos dados que você importar**.

> **Não é clone** de [app.workconsultoria.com](https://app.workconsultoria.com/). Não consulta APIs externas, módulos de terceiros nem bases de PII. Roda 100% no navegador.

## O que foi entregue / o que foi pulado

| Entregue | Pulado |
|----------|--------|
| UI de busca + detalhe | Clone do backend/APIs Work Consultoria |
| Import CSV/JSON | Scraping ou dump por CPF externo |
| Export CSV filtrado | E-mail/telefone de terceiros via web |
| Persistência localStorage | Integração com painéis comerciais |

## Como usar

```bash
npm install
npm run dev
```

1. Clique **Importar CSV / JSON** com a planilha **sua** (clientes que você já possui).
2. Busque por CPF, e-mail, telefone ou nome.
3. Exporte o resultado filtrado se precisar.

### CSV esperado

```csv
nome,cpf,email,telefone,cidade,notas
Maria Souza,123.456.789-00,maria@empresa.com,(11) 98888-7777,Campinas,Cliente ativo
```

Cabeçalhos aceitos também: `name`, `phone`, `celular`, `city`, `notes`, etc.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | oxlint |

## Stack

Vite + React 19 + TypeScript. Sem backend.
