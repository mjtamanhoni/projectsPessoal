import { defineConfig, loadEnv } from 'vite';
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
    index: path.resolve(__dirname, 'index.html'),
    gestor: htmlFiles.gestor,
    horas: htmlFiles.horas,
    producao: htmlFiles.producao,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  const clientPort = parseInt(env.VITE_PORT || '5173', 10);
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3001';

  return {
    plugins: [react()],
    base: '',
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
      port: clientPort,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
