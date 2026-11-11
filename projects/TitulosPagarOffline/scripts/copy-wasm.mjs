import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const origem = join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const destino = join(process.cwd(), 'public', 'assets', 'sql-wasm.wasm');

if (!existsSync(origem)) {
  console.warn('[copy-wasm] sql-wasm.wasm nao encontrado; rode npm install novamente.');
  process.exit(0);
}

mkdirSync(dirname(destino), { recursive: true });
copyFileSync(origem, destino);
console.log('[copy-wasm] public/assets/sql-wasm.wasm atualizado.');
