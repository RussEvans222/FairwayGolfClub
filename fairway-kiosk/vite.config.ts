import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy all /sfapi/* calls to Salesforce — bypasses CORS in dev
      '/sfapi': {
        target: 'https://storm-bd727290084d27.my.salesforce.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sfapi/, ''),
      },
      // Proxy OAuth token endpoint
      '/sfauth': {
        target: 'https://login.salesforce.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sfauth/, ''),
      },
    },
  },
})
