// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',       
    port: 10000,          
    strictPort: true,
    allowedHosts: [
      'bangla-italiano-22.onrender.com'
    ]
  }
})
