# SoulForge

App gratuito no estilo **SoulGen.ai**: geração de imagens AI com **NSFW liberado**, builder de personagem, edição/remix, Soul Chat e galeria.

> UI em português. Conteúdo adulto (18+).

## Funções (free vs SoulGen)

| SoulGen | SoulForge (grátis) |
|--------|---------------------|
| AI Character / text-to-image | Gerar + Personagem (Pollinations, `safe=false`) |
| NSFW | Intensidade SFW → Explícito, sem paywall |
| Smart Edit / remix | Aba Editar (img2img por URL) |
| Soul Chat | Chat adulto com o personagem atual |
| Galeria | LocalStorage no browser |
| Video HD / lip-sync | Sem equivalente free estável (nota no app) |

## Stack

- Vite + React 19 + TypeScript
- Pollinations.ai (imagem + texto) — sem API key obrigatória
- Modelo padrão: **Chroma** (no free da Pollinations, nomes desconhecidos podem cair em fallback `sana`)

## Como rodar

```bash
npm install
npm run dev
```

Opcional no `.env`:

```
VITE_POLLINATIONS_TOKEN=seu_token
```

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Dev server |
| `npm run build` | Build produção |
| `npm run preview` | Preview do build |
| `npm run lint` | oxlint |

## Regras

- Age gate 18+
- Personagens com idade mínima 18
- Uso por sua conta e risco; respeite leis locais
