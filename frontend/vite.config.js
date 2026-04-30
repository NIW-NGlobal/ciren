import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { loadSharedConfig } = require('../config/shared-config')

export default defineConfig(() => {
  const config = loadSharedConfig()

  process.env.VITE_API_BASE = config.frontendApiBase
  process.env.VITE_WS_URL = config.frontendWsUrl
  process.env.VITE_API_PREFIX = config.apiPrefix

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: config.frontendDevHost,
      port: config.frontendDevPort,
      proxy: {
        [config.apiPrefix]: {
          target: config.frontendProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: config.frontendDevHost,
      port: config.frontendPreviewPort,
    },
  }
})
