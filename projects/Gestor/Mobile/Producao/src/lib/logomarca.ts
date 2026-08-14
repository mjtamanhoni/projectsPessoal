import { fotoUrl } from '../api';

const LOGOMARCA_KEY = 'producao.logomarca';

export function getLogomarcaBase64(): string | null {
  return localStorage.getItem(LOGOMARCA_KEY);
}

export function limparLogomarcaCache(): void {
  localStorage.removeItem(LOGOMARCA_KEY);
}

export async function preloadLogomarca(logomarca?: string | null): Promise<void> {
  if (!logomarca) {
    limparLogomarcaCache();
    return;
  }
  try {
    const res = await fetch(fotoUrl(logomarca));
    if (!res.ok) throw new Error('falha ao buscar a logomarca');
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('falha ao ler a logomarca'));
      reader.readAsDataURL(blob);
    });
    localStorage.setItem(LOGOMARCA_KEY, dataUrl);
  } catch {
    limparLogomarcaCache();
  }
}
