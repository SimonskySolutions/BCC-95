import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The browser calls same-origin `/api/*`; Vite's dev server proxies it to the
// Node persistence service. Inside Docker that's the `api` compose service;
// override with VITE_API_PROXY when running the dev server outside Docker.
const apiTarget = process.env.VITE_API_PROXY || 'http://api:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
})
