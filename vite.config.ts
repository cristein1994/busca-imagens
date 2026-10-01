import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createApiMiddleware } from './server/middleware.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const api = createApiMiddleware(env)

  return {
    plugins: [
      react(),
      {
        name: 'darkgpt-api',
        configureServer(server) {
          server.middlewares.use(api)
        },
        configurePreviewServer(server) {
          server.middlewares.use(api)
        },
      },
    ],
    server: { host: true, port: 5173 },
    preview: { host: true, port: 5173 },
  }
})
