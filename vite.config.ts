export default defineConfig({
  base: '/', // Add this line
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 10000,
    allowedHosts: ['bangla-italiano-22.onrender.com']
  }
})
