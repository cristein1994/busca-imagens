# GrupoLista

Organize e exporte números de grupos do WhatsApp a partir de listas que **você já possui** (texto colado, CSV, planilhas).

> O app **não** conecta à sua conta WhatsApp e **não** faz scraping da plataforma. Os dados ficam apenas no `localStorage` do navegador.

## Funcionalidades

- Criar grupos e guardar listas de contatos
- Colar texto livre ou CSV e extrair telefones automaticamente
- Normalização para formato E.164 (foco Brasil +55)
- Deduplicação na importação
- Busca por nome/número
- Exportar CSV, JSON, vCard (.vcf) ou copiar números
- Abrir conversa via `wa.me`
- Adicionar contatos manualmente

## Como obter a lista de um grupo seu

1. Se você é admin/membro, copie números da info do grupo, de uma exportação ou de uma planilha que já tenha.
2. No GrupoLista: **Novo grupo** → aba **Importar** → cole o texto → **Extrair números**.
3. Aba **Baixar** → CSV / JSON / vCard.

## Instalação

```bash
npm install
npm run dev
```

Abra o endereço do Vite (geralmente `http://localhost:5173`).

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Pré-visualiza o build |
| `npm run lint` | Lint com oxlint |

## Stack

- Vite + React 19 + TypeScript
- CSS Modules
- Persistência local (`localStorage`)

## Privacidade

Use apenas listas de grupos dos quais você participa ou administra. Respeite a LGPD e os termos do WhatsApp.
