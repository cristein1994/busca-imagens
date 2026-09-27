import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { channelEnginePlugin } from './server/plugin.ts'

export default defineConfig({
  plugins: [react(), channelEnginePlugin()],
})
