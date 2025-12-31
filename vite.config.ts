import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // or your specific plugin

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'bangla-italiano-22.onrender.com'
    ]
  }
})
