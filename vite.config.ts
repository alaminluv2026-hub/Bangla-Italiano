// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // CRITICAL: Ensures assets load from the correct root path
  server: {
    host: '0.0.0.0',
    port: 10000,
    allowedHosts: ['bangla-italiano-22.onrender.com']
  }
})
