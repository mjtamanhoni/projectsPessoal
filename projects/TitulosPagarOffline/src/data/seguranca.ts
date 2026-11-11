import { run } from '../db/connection';
import { base64ParaBytes, bytesParaBase64 } from './base64';
import { obterConfig } from './config';

const ITERACOES = 120000;
const TAMANHO_MIN = 4;
const TAMANHO_MAX = 8;

function validarPin(pin: string): void {
  if (!/^\d+$/.test(pin)) {
    throw new Error('O PIN deve conter apenas números.');
  }
  if (pin.length < TAMANHO_MIN || pin.length > TAMANHO_MAX) {
    throw new Error(`O PIN deve ter de ${TAMANHO_MIN} a ${TAMANHO_MAX} dígitos.`);
  }
}

async function derivar(pin: string, salt: Uint8Array, iteracoes: number): Promise<string> {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: iteracoes, hash: 'SHA-256' },
    chave,
    256
  );
  return bytesParaBase64(new Uint8Array(bits));
}

export async function definirPin(pin: string): Promise<void> {
  validarPin(pin);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(pin, salt, ITERACOES);
  await run('INSERT OR IGNORE INTO app_config (id) VALUES (1)');
  await run(
    `UPDATE app_config
        SET pin_hash = ?, pin_salt = ?, pin_iter = ?, pin_len = ?,
            atualizado_em = datetime('now')
      WHERE id = 1`,
    [hash, bytesParaBase64(salt), ITERACOES, pin.length]
  );
}

export async function verificarPin(pin: string): Promise<boolean> {
  const config = await obterConfig();
  if (!config.pin_hash || !config.pin_salt) return false;
  const salt = base64ParaBytes(config.pin_salt);
  const hash = await derivar(pin, salt, config.pin_iter);
  return hash === config.pin_hash;
}

export async function removerPin(): Promise<void> {
  await run(
    `UPDATE app_config
        SET pin_hash = NULL, pin_salt = NULL, biometria = 0,
            atualizado_em = datetime('now')
      WHERE id = 1`
  );
}

export async function temPin(): Promise<boolean> {
  const config = await obterConfig();
  return Boolean(config.pin_hash && config.pin_salt);
}
