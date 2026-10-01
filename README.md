# PROMPTOR

Gerador de **prompts completos** com personalização de **personagens de IA** e **instruções de sistema**.

SPA em Vite + React + TypeScript. Tudo roda no navegador — sem backend e sem API key.

## Funcionalidades

- **Personagem**: nome, arquétipo, papel, tom, voz, background, traços, conhecimento, limites, catchphrases e exemplo de diálogo
- **Instruções**: missão, público, formato de saída, raciocínio, regras, must-include / must-avoid, critérios de sucesso
- **Tarefa**: objetivo, contexto, extensão e criatividade
- **Prompt ao vivo** em modo completo ou compacto
- **Presets prontos** de personagens e pacotes de instruções
- **Biblioteca local** (localStorage): salvar, carregar, apagar, importar/exportar JSON e baixar Markdown
- Copiar para a área de transferência

## Instalação e execução

```bash
npm install
npm run dev
```

Abra o endereço indicado (geralmente `http://localhost:5173`).

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Pré-visualiza o build |
| `npm run lint` | Lint com oxlint |

## Stack

- Vite + React 19 + TypeScript
- CSS Modules + design tokens
- Persistência via `localStorage`

## Licença

Projeto de demonstração / uso pessoal.
