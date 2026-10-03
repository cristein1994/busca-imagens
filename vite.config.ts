import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Proxy pra scrap de classificados públicos sem CORS no browser.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/scrape/boygp': {
        target: 'https://boy.gp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scrape\/boygp/, ''),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
      },
      '/scrape/gcl': {
        target: 'https://garotocomlocal.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scrape\/gcl/, ''),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
      },
    },
  },
})
