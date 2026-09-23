import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { lenteApi } from './server/plugin.ts'

export default defineConfig({
  plugins: [react(), lenteApi()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
