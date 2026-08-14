import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginApi, type LoginResponse, type EmpresaPublic } from './api';
import { limparLogomarcaCache, preloadLogomarca } from './lib/logomarca';

const TOKEN_KEY = 'producao.token';
const USER_KEY = 'producao.user';
const EMPRESA_KEY = 'producao.empresa';
const LAST_LOGIN_KEY = 'producao.ultimoLogin';

export type EntradaLogin = 'login' | 'pin';

export interface UltimoLogin {
  empresaId: number;
  tipo: EntradaLogin;
  usuarioNome?: string;
  data: string;
}

export function getUltimoLogin(): UltimoLogin | null {
  try {
    const raw = localStorage.getItem(LAST_LOGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.empresaId === 'number' && (parsed.tipo === 'login' || parsed.tipo === 'pin')) {
      return parsed as UltimoLogin;
    }
  } catch {
    /* ignora */
  }
  return null;
}

interface AuthState {
  autenticado: boolean;
  usuario: LoginResponse | null;
  empresaNome: string;
  empresa: EmpresaPublic | null;
  login: (cnpjCpf: string, login: string, senha: string) => Promise<void>;
  loginPin: (cnpjCpf: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<LoginResponse | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaPublic | null>(null);
  const [empresaNome, setEmpresaNome] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EMPRESA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EmpresaPublic;
        setEmpresa(parsed);
        setEmpresaNome(parsed.fantasia || parsed.razao_social || '');
        void preloadLogomarca(parsed.logomarca);
      }
    } catch {
      /* ignora */
    }
    const onUnauthorized = () => {
      setUsuario(null);
      setEmpresa(null);
      setEmpresaNome('');
      limparLogomarcaCache();
    };
    window.addEventListener('producao:unauthorized', onUnauthorized);
    return () => window.removeEventListener('producao:unauthorized', onUnauthorized);
  }, []);

  const salvarSessao = (data: LoginResponse, empresaData: EmpresaPublic, tipo: EntradaLogin, usuario?: string) => {
    setUsuario(data);
    setEmpresa(empresaData);
    setEmpresaNome(empresaData.fantasia || empresaData.razao_social || '');
    void preloadLogomarca(empresaData.logomarca);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data));
    localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresaData));
    localStorage.setItem(
      LAST_LOGIN_KEY,
      JSON.stringify({
        empresaId: data.empresa,
        tipo,
        usuarioNome: usuario ?? '',
        data: new Date().toISOString(),
      })
    );
  };

  const login = async (cnpjCpf: string, login: string, senha: string) => {
    const data = await loginApi({ login, senha, empresa: cnpjCpf });
    const empData: EmpresaPublic = data.empresa_info ?? { id: data.empresa, razao_social: '', fantasia: '' };
    salvarSessao(data, empData, 'login', login);
  };

  const loginPin = async (cnpjCpf: string, pin: string) => {
    const data = await loginApi({ pin, empresa: cnpjCpf });
    const empData: EmpresaPublic = data.empresa_info ?? { id: data.empresa, razao_social: '', fantasia: '' };
    salvarSessao(data, empData, 'pin');
  };

  const logout = () => {
    setUsuario(null);
    setEmpresa(null);
    setEmpresaNome('');
    limparLogomarcaCache();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EMPRESA_KEY);
  };

  return (
    <AuthContext.Provider
      value={{ autenticado: !!usuario, usuario, empresaNome, empresa, login, loginPin, logout }}
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
