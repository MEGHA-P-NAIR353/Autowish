import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],

  server: {
    // Required for Railway/Docker networking
    host: '0.0.0.0',

    // Railway will expose this port
    port: 5173,

    // Prevent Vite from blocking Railway-generated domains
    allowedHosts: true,

    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },

      '/media': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
})