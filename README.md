# Busca Imagens

SPA moderna para buscar imagens usando a [API do Unsplash](https://unsplash.com/developers).

> **Note (EN):** The UI labels are in Portuguese (Buscar, Resultados, Carregando, etc.).

## Funcionalidades

- Campo de busca com botão e suporte a Enter
- Grade responsiva de imagens
- Lightbox/modal ao clicar: imagem ampliada, crédito do fotógrafo, copiar URL e abrir original
- Estados de carregamento, vazio e erro
- Bloqueio de envio duplo enquanto carrega
- Layout mobile-friendly
- Assistente Grok: descreva a foto e o bot monta a busca no Unsplash

## Pré-requisitos

- Node.js 18+ (recomendado)
- Conta e Access Key no Unsplash Developers

## Como obter a chave da API

1. Acesse [https://unsplash.com/developers](https://unsplash.com/developers)
2. Crie uma conta (ou faça login)
3. Crie um novo aplicativo (Your apps → New Application)
4. Copie a **Access Key**

## Instalação e execução

```bash
# Clone o repositório
git clone https://github.com/cristein1994/busca-imagens.git
cd busca-imagens

# Instale as dependências
npm install

# Configure a chave (copie o exemplo e edite)
cp .env.example .env
# Edite .env e defina:
# VITE_UNSPLASH_ACCESS_KEY=sua_access_key_aqui
# XAI_API_KEY=sua_api_key_do_grok

# Inicie o servidor de desenvolvimento
npm run dev
```

Abra o endereço indicado no terminal (geralmente `http://localhost:5173`).

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção |
| `npm run preview` | Pré-visualiza o build |
| `npm run lint` | Lint com oxlint |
| `npm test` | Testes do assistente Grok |

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_UNSPLASH_ACCESS_KEY` | Access Key do Unsplash (obrigatória para buscar) |
| `XAI_API_KEY` | API key do Grok. Lida só pelo servidor Vite; não use o prefixo `VITE_` |
| `GROK_MODEL` | Opcional. Modelo do chat (padrão `grok-4.7`) |

Se a chave do Unsplash estiver ausente, o app exibe uma mensagem clara de configuração e **não** quebra. O botão **Grok** pede a `XAI_API_KEY` se ela ainda não estiver no `.env`.

## Assistente Grok

O painel no canto da tela conversa com a [API do Grok](https://docs.x.ai/) em `POST /api/grok`. A rota existe no `npm run dev` e no `npm run preview`. A chave não é enviada ao navegador.

1. Crie uma API key em [console.x.ai](https://console.x.ai/)
2. Defina `XAI_API_KEY` no `.env`
3. Reinicie o servidor

Descreva uma foto (ou use uma sugestão). Quando o modelo chama a busca, o app preenche o campo e consulta o Unsplash.

## Stack

- Vite + React + TypeScript
- CSS Modules (sem UI kit pesado)
- Unsplash Photos Search API

## Licença

Projeto de demonstração. As fotos pertencem aos respectivos autores no Unsplash — respeite os [termos de uso da API](https://unsplash.com/api-terms).
