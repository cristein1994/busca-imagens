import type { Plugin } from 'vite'
import { handleApi } from './router.ts'

const globalState = globalThis as typeof globalThis & { __lenteGuard?: boolean }
if (!globalState.__lenteGuard) {
  globalState.__lenteGuard = true
  process.on('uncaughtException', (error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Lente manteve o processo após erro de rede: ${message}`)
  })
}

export function lenteApi(): Plugin {
  return {
    name: 'lente-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleApi(req, res).then((handled) => {
          if (!handled) next()
        }).catch(next)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleApi(req, res).then((handled) => {
          if (!handled) next()
        }).catch(next)
      })
    },
  }
}
