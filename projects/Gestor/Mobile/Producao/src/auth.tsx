import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginApi, type LoginResponse } from './api';

const TOKEN_KEY = 'producao.token';
const USER_KEY = 'producao.user';
const EMPRESA_KEY = 'producao.empresaNome';

interface AuthState {
  autenticado: boolean;
  usuario: LoginResponse | null;
  empresaNome: string;
  login: (empresa: number, login: string, senha: string, empresaNome: string) => Promise<void>;
  loginPin: (empresa: number, pin: string, empresaNome: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<LoginResponse | null>(null);
  const [empresaNome, setEmpresaNome] = useState('');

  useEffect(() => {
    const onUnauthorized = () => {
      setUsuario(null);
      setEmpresaNome('');
    };
    window.addEventListener('producao:unauthorized', onUnauthorized);
    return () => window.removeEventListener('producao:unauthorized', onUnauthorized);
  }, []);

  const salvarSessao = (data: LoginResponse, nomeEmpresa: string) => {
    setUsuario(data);
    setEmpresaNome(nomeEmpresa);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data));
    localStorage.setItem(EMPRESA_KEY, nomeEmpresa);
  };

  const login = async (empresa: number, login: string, senha: string, nomeEmpresa: string) => {
    const data = await loginApi({ login, senha, empresa });
    salvarSessao(data, nomeEmpresa);
  };

  const loginPin = async (empresa: number, pin: string, nomeEmpresa: string) => {
    const data = await loginApi({ pin, empresa });
    salvarSessao(data, nomeEmpresa);
  };

  const logout = () => {
    setUsuario(null);
    setEmpresaNome('');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EMPRESA_KEY);
  };

  return (
    <AuthContext.Provider
      value={{ autenticado: !!usuario, usuario, empresaNome, login, loginPin, logout }}
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
