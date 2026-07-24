import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function getInput() {
  const mode = process.env.VITE_APP_MODE || '';
  const htmlFiles: Record<string, string> = {
    gestor: path.resolve(__dirname, 'index-gestor.html'),
    horas: path.resolve(__dirname, 'index-horas.html'),
    producao: path.resolve(__dirname, 'index-producao.html'),
  };
  if (mode && htmlFiles[mode]) {
    return { [mode]: htmlFiles[mode] };
  }
  return {
    gestor: htmlFiles.gestor,
    horas: htmlFiles.horas,
    producao: htmlFiles.producao,
  };
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_APP_MODE': JSON.stringify(process.env.VITE_APP_MODE || ''),
  },
  build: {
    rollupOptions: {
      input: getInput(),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
