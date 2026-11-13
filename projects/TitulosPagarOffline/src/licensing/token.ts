import { LICENCA_PUBLIC_KEY_JWK, LICENCA_TIPO } from './publicKey';

export interface TokenHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

export interface TokenPayload {
  v: number;
  tipo: string;
  plano: string;
  cliente?: string;
  cnpj?: string;
  device?: string | null;
  emitido_em?: string;
  key_id?: string;
  iat?: number;
  exp?: number;
  obs?: string;
}

export interface TokenVerificado {
  header: TokenHeader;
  payload: TokenPayload;
}

export class TokenInvalidoError extends Error {
  constructor(message = 'Token de licença inválido.') {
    super(message);
    this.name = 'TokenInvalidoError';
  }
}

let chavePublica: Promise<CryptoKey> | null = null;

function chave(): Promise<CryptoKey> {
  if (!chavePublica) {
    chavePublica = crypto.subtle.importKey(
      'jwk',
      LICENCA_PUBLIC_KEY_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
  }
  return chavePublica;
}

function base64UrlParaBytes(valor: string): Uint8Array {
  const normalizado = valor.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalizado.length % 4;
  const completo = normalizado + (padding ? '='.repeat(4 - padding) : '');
  const binario = atob(completo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

function decodificarJson<T>(valor: string): T {
  const texto = new TextDecoder().decode(base64UrlParaBytes(valor));
  return JSON.parse(texto) as T;
}

export function normalizarToken(token: string): string {
  return token.replace(/\s+/g, '');
}

export async function verificarToken(tokenOriginal: string): Promise<TokenVerificado> {
  const token = normalizarToken(tokenOriginal);
  const partes = token.split('.');
  if (partes.length !== 3) throw new TokenInvalidoError('Token de licença incompleto.');

  const [cabecalhoB64, conteudoB64, assinaturaB64] = partes;
  if (!cabecalhoB64 || !conteudoB64 || !assinaturaB64) {
    throw new TokenInvalidoError('Token de licença incompleto.');
  }

  let header: TokenHeader;
  let payload: TokenPayload;
  try {
    header = decodificarJson<TokenHeader>(cabecalhoB64);
    payload = decodificarJson<TokenPayload>(conteudoB64);
  } catch {
    throw new TokenInvalidoError('Não foi possível ler o token de licença.');
  }

  if (!header || header.alg !== 'ES256') {
    throw new TokenInvalidoError('Algoritmo do token não suportado.');
  }

  const assinatura = base64UrlParaBytes(assinaturaB64);
  if (assinatura.length !== 64) {
    throw new TokenInvalidoError('Assinatura do token inválida.');
  }

  const entrada = new TextEncoder().encode(`${cabecalhoB64}.${conteudoB64}`);
  let valida = false;
  try {
    valida = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await chave(),
      assinatura as unknown as BufferSource,
      entrada as unknown as BufferSource
    );
  } catch {
    throw new TokenInvalidoError('Não foi possível validar a assinatura do token.');
  }

  if (!valida) throw new TokenInvalidoError('Assinatura do token inválida.');

  if (!payload || payload.v !== 1 || payload.tipo !== LICENCA_TIPO) {
    throw new TokenInvalidoError('Token não pertence a este aplicativo.');
  }
  if (typeof payload.plano !== 'string' || !payload.plano.trim()) {
    throw new TokenInvalidoError('Plano do token não informado.');
  }
  if (payload.exp !== undefined && (!Number.isFinite(payload.exp) || payload.exp <= 0)) {
    throw new TokenInvalidoError('Validade do token inválida.');
  }
  if (payload.device != null && typeof payload.device !== 'string') {
    throw new TokenInvalidoError('Aparelho do token inválido.');
  }

  return { header, payload };
}
