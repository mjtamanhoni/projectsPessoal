import api from './api';
import type { AppSettings } from '@/types';

const LOGO_KEY = 'app-logo';
const LOGO_PDF_KEY = 'app-logo-pdf';

let cache: AppSettings | null = null;

export async function fetchSettings(): Promise<AppSettings> {
  const res = await api.get('/settings');
  cache = res.data as AppSettings;
  if (cache.logoBase64) {
    localStorage.setItem(LOGO_KEY, cache.logoBase64);
  } else {
    localStorage.removeItem(LOGO_KEY);
  }
  if (cache.logoPdfBase64) {
    localStorage.setItem(LOGO_PDF_KEY, cache.logoPdfBase64);
  } else {
    localStorage.removeItem(LOGO_PDF_KEY);
  }
  return cache;
}

export async function saveSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  const res = await api.put('/settings', data);
  cache = res.data as AppSettings;
  if (cache.logoBase64) {
    localStorage.setItem(LOGO_KEY, cache.logoBase64);
  } else {
    localStorage.removeItem(LOGO_KEY);
  }
  if (cache.logoPdfBase64) {
    localStorage.setItem(LOGO_PDF_KEY, cache.logoPdfBase64);
  } else {
    localStorage.removeItem(LOGO_PDF_KEY);
  }
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
  return localStorage.getItem(LOGO_KEY);
}

export function getLogoPdf(): string | null {
  return localStorage.getItem(LOGO_PDF_KEY);
}
