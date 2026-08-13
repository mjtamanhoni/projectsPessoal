import { getBaseURL } from './serverConfig';
import type { User } from '@/types';

function getEmpresaId(): number | null {
  const raw = localStorage.getItem('user');
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

export function salvarLogomarcaCache(logomarcaBase64: string | null): void {
  const key = logoKey();
  if (logomarcaBase64) {
    localStorage.setItem(key, logomarcaBase64);
  } else {
    localStorage.removeItem(key);
  }
}

export async function preloadEmpresaLogomarca(logomarca?: string | null): Promise<void> {
  const key = logoKey();
  const url = getUploadsUrl(logomarca);
  try {
    if (!url) {
      localStorage.removeItem(key);
      return;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('falha ao buscar a logomarca');
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('falha ao ler a imagem'));
      reader.readAsDataURL(blob);
    });
    localStorage.setItem(key, dataUrl);
  } catch {
    localStorage.removeItem(key);
  }
}