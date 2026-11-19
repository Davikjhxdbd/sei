import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // O preview é servido por um host público; em modo preview aceitamos o host
    // encaminhado pelo proxy. Fora do preview, a checagem padrão continua ativa.
    allowedHosts: process.env.BASE44_PREVIEW_MODE === '1' ? true : undefined,
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
