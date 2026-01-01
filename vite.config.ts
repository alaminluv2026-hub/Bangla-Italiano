import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vitejs.dev
export default defineConfig({
  plugins: [react()],
  // 'base' should be '/' for Vercel root deployments. 
  // If you see a blank screen, ensure this is NOT set to a relative path like './'
  base: '/', 
  build: {
    // This ensures the output directory matches Vercel's default 'dist'
    outDir: 'dist',
  },
  server: {
    // Useful for local debugging to match the port Vercel might expect
    port: 3000,
  }
})
