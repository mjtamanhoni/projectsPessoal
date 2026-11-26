import { getBaseURL } from './serverConfig';
import type { User } from '@/types';

export function getEmpresaId(): number | null {
  const raw = sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as User;
    return user.empresaId ?? null;
  } catch {
    return null;
  }
}

export function getUploadsUrl(caminhoRelativo?: string | null): string | null {
  if (!caminhoRelativo) return null;
  const base = getBaseURL();
  return `${base}/uploads/${caminhoRelativo.replace(/^\/+/, '')}`;
}

function logoKey(): string {
  const id = getEmpresaId();
  return id ? `app-logo-${id}` : 'app-logo';
}

let preloadSeq = 0;

export function salvarLogomarcaCache(logomarcaBase64: string | null): void {
  preloadSeq++;
  const key = logoKey();
  if (logomarcaBase64) {
    sessionStorage.setItem(key, logomarcaBase64);
  } else {
    sessionStorage.removeItem(key);
  }
  window.dispatchEvent(new CustomEvent('logo:updated'));
}

export async function preloadEmpresaLogomarca(logomarca?: string | null): Promise<void> {
  const seq = ++preloadSeq;
  const key = logoKey();
  const url = getUploadsUrl(logomarca);
  try {
    if (!url) {
      if (seq === preloadSeq) sessionStorage.removeItem(key);
      return;
    }
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('falha ao buscar a logomarca');
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('falha ao ler a imagem'));
      reader.readAsDataURL(blob);
    });
    if (seq === preloadSeq) sessionStorage.setItem(key, dataUrl);
  } catch {
    if (seq === preloadSeq) sessionStorage.removeItem(key);
  } finally {
    if (seq === preloadSeq) window.dispatchEvent(new CustomEvent('logo:updated'));
  }
}