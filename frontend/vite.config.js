import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // While developing, anything starting with /api is forwarded to the Flask
    // backend on port 5000. That means the frontend can just call "/api/..."
    // and we never hit CORS problems locally.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
