import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:7070',
      '/ws': { target: 'ws://localhost:7070', ws: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@xyflow')) return 'react-flow'
          if (id.includes('yjs') || id.includes('y-websocket')) return 'yjs'
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf'
        },
      },
    },
  },
})
