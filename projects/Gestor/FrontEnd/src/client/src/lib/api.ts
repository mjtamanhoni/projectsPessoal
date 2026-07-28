import axios from 'axios';
import { getBaseURL } from './serverConfig';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const event = new CustomEvent('auth:unauthorized', { detail: error.response?.data?.error || 'Sessão expirada' });
        window.dispatchEvent(event);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
