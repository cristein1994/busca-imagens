import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { resolveGrokConfig } from './server/grok.ts'
import { createGrokMiddleware } from './server/middleware.ts'

function grokApiPlugin(): Plugin {
  const attach = (mode: string) => {
    const fileEnv = loadEnv(mode, process.cwd(), '')
    const config = resolveGrokConfig({
      XAI_API_KEY: process.env.XAI_API_KEY || fileEnv.XAI_API_KEY,
      GROK_MODEL: process.env.GROK_MODEL || fileEnv.GROK_MODEL,
    })
    return createGrokMiddleware(config)
  }

  return {
    name: 'grok-api',
    configureServer(server) {
      server.middlewares.use(attach(server.config.mode))
    },
    configurePreviewServer(server) {
      server.middlewares.use(attach(server.config.mode))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), grokApiPlugin()],
})
