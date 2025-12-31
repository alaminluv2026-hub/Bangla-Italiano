import { defineConfig } from 'vite'
import react from '@vitets/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'bangla-italiano-22.onrender.com'
    ]
  }
})
