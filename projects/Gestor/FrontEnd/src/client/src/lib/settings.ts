import api from './api';
import type { AppSettings, User } from '@/types';

let cache: AppSettings | null = null;

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

function logoKey(): string {
  const id = getEmpresaId();
  return id ? `app-logo-${id}` : 'app-logo';
}

function logoPdfKey(): string {
  const id = getEmpresaId();
  return id ? `app-logo-pdf-${id}` : 'app-logo-pdf';
}

function saveLogosToStorage(settings: AppSettings) {
  const lKey = logoKey();
  const pKey = logoPdfKey();
  if (settings.logoBase64) {
    localStorage.setItem(lKey, settings.logoBase64);
  } else {
    localStorage.removeItem(lKey);
  }
  if (settings.logoPdfBase64) {
    localStorage.setItem(pKey, settings.logoPdfBase64);
  } else {
    localStorage.removeItem(pKey);
  }
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await api.get('/settings');
  cache = res.data as AppSettings;
  saveLogosToStorage(cache);
  return cache;
}

export async function saveSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  const res = await api.put('/settings', data);
  cache = res.data as AppSettings;
  saveLogosToStorage(cache);
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
  return localStorage.getItem(logoKey());
}

export function getLogoPdf(): string | null {
  return localStorage.getItem(logoPdfKey());
}
