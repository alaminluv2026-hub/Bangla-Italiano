// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Ensures assets load from the correct root path
  server: {
    host: '0.0.0.0',
    port: 10000,
    strictPort: true,
    allowedHosts: true // Allows all hosts to bypass the 'Blocked request' error
  }
})
