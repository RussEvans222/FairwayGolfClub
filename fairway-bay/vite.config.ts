import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5181,
    proxy: {
      '/sfapi': {
        target: 'https://storm-bd727290084d27.my.salesforce.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sfapi/, ''),
      },
    },
  },
})
