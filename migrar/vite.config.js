import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        hc: resolve(__dirname, 'hc.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: '/index.html',
  },
})
