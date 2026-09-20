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

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_UNSPLASH_ACCESS_KEY` | Access Key do Unsplash (obrigatória para buscar) |

Se a chave estiver ausente, o app exibe uma mensagem clara de configuração e **não** quebra.

## Stack

- Vite + React + TypeScript
- CSS Modules (sem UI kit pesado)
- Unsplash Photos Search API

## Licença

Projeto de demonstração. As fotos pertencem aos respectivos autores no Unsplash — respeite os [termos de uso da API](https://unsplash.com/api-terms).
