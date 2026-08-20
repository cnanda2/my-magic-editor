import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
      // Hardware-blocks editor (build/editor.html) served by the backend on :3001
      '/editor.html': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/js': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/images': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/favicon.svg': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/manifest.webmanifest': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
