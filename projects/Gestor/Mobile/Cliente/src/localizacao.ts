import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { reverseGeocode } from './api';

export interface RegiaoDetectada {
  cidade: string;
  uf: string;
  codigo_ibge: string;
  latitude: number;
  longitude: number;
  detectada_em: number;
}

const STORAGE_KEY = 'chegou_regiao_entrega';
const VALIDADE_MS = 12 * 60 * 60 * 1000;

export function getRegiaoSalva(): RegiaoDetectada | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RegiaoDetectada;
    if (!parsed?.codigo_ibge || !parsed.cidade || !parsed.uf) return null;
    if (Date.now() - (parsed.detectada_em ?? 0) > VALIDADE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function salvarRegiao(regiao: RegiaoDetectada) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(regiao));
  } catch {
    /* armazenamento indisponivel */
  }
}

export function limparRegiao() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* armazenamento indisponivel */
  }
}

async function obterCoordenadas(tempoLimiteMs = 6000): Promise<{ latitude: number; longitude: number } | null> {
  const comTimeout = <T,>(promise: Promise<T>, ms: number) =>
    Promise.race<T | null>([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);

  try {
    if (Capacitor.isNativePlatform()) {
      const permissao = await Geolocation.checkPermissions();
      if (permissao.location !== 'granted') {
        const pedido = await Geolocation.requestPermissions();
        if (pedido.location !== 'granted') return null;
      }
      const pos = await comTimeout(
        Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: tempoLimiteMs, maximumAge: 300000 }),
        tempoLimiteMs + 1000,
      );
      if (!pos) return null;
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    const pos = await comTimeout(
      new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: tempoLimiteMs,
          maximumAge: 300000,
        }),
      ),
      tempoLimiteMs + 1000,
    );
    if (!pos) return null;
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

export async function detectarRegiao(): Promise<RegiaoDetectada | null> {
  const cache = getRegiaoSalva();
  try {
    const coords = await obterCoordenadas();
    if (!coords) return cache;
    const geo = await reverseGeocode(coords.latitude, coords.longitude);
    if (!geo?.codigo_ibge || geo.fora_do_pais) return cache;
    const regiao: RegiaoDetectada = {
      cidade: geo.cidade,
      uf: geo.uf,
      codigo_ibge: geo.codigo_ibge,
      latitude: coords.latitude,
      longitude: coords.longitude,
      detectada_em: Date.now(),
    };
    salvarRegiao(regiao);
    return regiao;
  } catch {
    return cache;
  }
}

export function descricaoRegiao(regiao: RegiaoDetectada | null): string {
  if (!regiao) return '';
  return `${regiao.cidade}/${regiao.uf}`;
}
