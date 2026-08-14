import api from './api';
import type { AppSettings, User } from '@/types';

let cache: AppSettings | null = null;

function getEmpresaId(): number | null {
  const raw = sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as User;
    return user.empresaId ?? null;
  } catch {
    return null;
  }
}

function logoKey(): string {
  const id = getEmpresaId();
  return id ? `app-logo-${id}` : 'app-logo';
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await api.get('/settings');
  cache = res.data as AppSettings;
  return cache;
}

export async function saveSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  const res = await api.put('/settings', data);
  cache = res.data as AppSettings;
  window.dispatchEvent(new CustomEvent('settings:saved'));
  return cache;
}

export function getCachedSettings(): AppSettings | null {
  return cache;
}

export function getDecimalPlaces(): number {
  return cache?.display?.number?.decimalPlaces ?? 4;
}

export function getLogo(): string | null {
  return sessionStorage.getItem(logoKey());
}

export function getLogoPdf(): string | null {
  return getLogo();
}
