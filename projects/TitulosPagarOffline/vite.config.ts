import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function gerarVersao(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
}

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(gerarVersao()),
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5176,
    host: true,
  },
});
