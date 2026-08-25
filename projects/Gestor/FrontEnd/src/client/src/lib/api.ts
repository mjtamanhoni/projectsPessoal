import axios from 'axios';
import { getBaseURL } from './serverConfig';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const dynamicBase = getBaseURL();
  if (dynamicBase !== '/api') {
    config.baseURL = dynamicBase;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        const event = new CustomEvent('auth:unauthorized', { detail: error.response?.data?.error || 'Sessão expirada' });
        window.dispatchEvent(event);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export async function buscarCep(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
  const nums = cep.replace(/\D/g, '');
  if (nums.length !== 8) return null;
  try {
    const { data } = await api.get(`/cep/${nums}`);
    if (data?.erro) return null;
    return data;
  } catch {
    return null;
  }
}
