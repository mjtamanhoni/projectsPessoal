import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearSession,
  loginApi,
  TOKEN_KEY,
  type EmpresaPublic,
  type LoginResponse,
} from './api';

const USER_KEY = 'titulos.user';
const EMPRESA_KEY = 'titulos.empresa';
const ULTIMO_CNPJ_KEY = 'titulos.ultimoCnpj';

interface AuthState {
  autenticado: boolean;
  usuario: LoginResponse | null;
  empresa: EmpresaPublic | null;
  login: (cnpjCpf: string, login: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function lerStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function getUltimoCnpj(): string {
  try {
    return localStorage.getItem(ULTIMO_CNPJ_KEY) || '';
  } catch {
    return '';
  }
}

export function salvarUltimoCnpj(cnpj: string) {
  try {
    localStorage.setItem(ULTIMO_CNPJ_KEY, cnpj);
  } catch {
    /* ignora */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<LoginResponse | null>(() => lerStorage<LoginResponse>(USER_KEY));
  const [empresa, setEmpresa] = useState<EmpresaPublic | null>(() => lerStorage<EmpresaPublic>(EMPRESA_KEY));

  const logout = useCallback(() => {
    setUsuario(null);
    setEmpresa(null);
    clearSession();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('titulos:unauthorized', onUnauthorized);
    return () => window.removeEventListener('titulos:unauthorized', onUnauthorized);
  }, [logout]);

  const login = async (cnpjCpf: string, login: string, senha: string) => {
    const data = await loginApi({ login, senha, empresa: cnpjCpf });
    const empresaData: EmpresaPublic = data.empresa_info ?? {
      id: data.empresa,
      razao_social: '',
      fantasia: '',
    };
    setUsuario(data);
    setEmpresa(empresaData);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data));
    localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresaData));
    salvarUltimoCnpj(cnpjCpf);
  };

  return (
    <AuthContext.Provider
      value={{ autenticado: !!usuario && !!empresa, usuario, empresa, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
