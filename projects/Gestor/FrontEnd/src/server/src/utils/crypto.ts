import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export function criptografar(senha: string): string {
  const salt = randomBytes(16);
  const senhaBytes = Buffer.from(senha, 'utf8');
  const combinado = Buffer.concat([salt, senhaBytes]);
  const hash = createHash('sha256').update(combinado).digest('hex');
  const saltBase64 = salt.toString('base64');
  return `${saltBase64}:${hash}`;
}

export function validar(senha: string, hashArmazenado: string): boolean {
  const partes = hashArmazenado.split(':');
  if (partes.length !== 2) {
    return false;
  }

  const saltBase64 = partes[0];
  const hashOriginal = partes[1];

  let salt: Buffer;
  try {
    salt = Buffer.from(saltBase64, 'base64');
  } catch {
    return false;
  }

  const senhaBytes = Buffer.from(senha, 'utf8');
  const combinado = Buffer.concat([salt, senhaBytes]);
  const hashCalculado = createHash('sha256').update(combinado).digest('hex');

  if (hashCalculado.length !== hashOriginal.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(hashCalculado), Buffer.from(hashOriginal));
}