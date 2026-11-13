import api from './api';
import type { ErpLookups } from '@/types/erp';

export async function erpListar<T>(recurso: string, params?: Record<string, unknown>): Promise<T[]> {
  const res = await api.get(`/erp/${recurso}`, { params });
  return res.data as T[];
}

export async function erpObter<T>(recurso: string, id: number): Promise<T> {
  const res = await api.get(`/erp/${recurso}/${id}`);
  return res.data as T;
}

export async function erpSalvar<T>(recurso: string, body: unknown, id?: number): Promise<T> {
  const res = id
    ? await api.put(`/erp/${recurso}/${id}`, body)
    : await api.post(`/erp/${recurso}`, body);
  return res.data as T;
}

export async function erpExcluir(recurso: string, id: number): Promise<void> {
  await api.delete(`/erp/${recurso}/${id}`);
}

export async function erpLookups(): Promise<ErpLookups> {
  const res = await api.get('/erp/lookups');
  return res.data as ErpLookups;
}
