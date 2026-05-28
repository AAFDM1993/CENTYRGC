import { defineConfig } from 'vite'
import { resolve } from 'path'
import { cp } from 'fs/promises'

export default defineConfig({
  plugins: [
    {
      // Copia src/ → dist/src/ después del build para que los
      // plain <script src> funcionen en el sitio deployado
      name: 'copy-src-to-dist',
      apply: 'build',
      closeBundle: async () => {
        await cp('src', 'dist/src', { recursive: true })
      }
    }
  ],
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
