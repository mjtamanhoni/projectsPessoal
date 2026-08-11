import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Cliente, EmpresaPublic } from './api';

const EMPRESA_KEY = 'cliente.empresa';
const CLIENTE_KEY = 'cliente.cliente';

interface SessaoState {
  empresa: EmpresaPublic | null;
  cliente: Cliente | null;
  entrar: (empresa: EmpresaPublic, cliente: Cliente) => void;
  setIdCliente: (id: number) => void;
  sair: () => void;
}

const SessaoContext = createContext<SessaoState | null>(null);

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaPublic | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  useEffect(() => {
    try {
      const em = localStorage.getItem(EMPRESA_KEY);
      if (em) setEmpresa(JSON.parse(em) as EmpresaPublic);
    } catch {
      /* ignora */
    }
    try {
      const cl = localStorage.getItem(CLIENTE_KEY);
      if (cl) setCliente(JSON.parse(cl) as Cliente);
    } catch {
      /* ignora */
    }
  }, []);

  const entrar = (empresaData: EmpresaPublic, clienteData: Cliente) => {
    setEmpresa(empresaData);
    setCliente(clienteData);
    localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresaData));
    localStorage.setItem(CLIENTE_KEY, JSON.stringify(clienteData));
  };

  const setIdCliente = (id: number) => {
    if (!cliente) return;
    const novo = { ...cliente, id };
    setCliente(novo);
    localStorage.setItem(CLIENTE_KEY, JSON.stringify(novo));
  };

  const sair = () => {
    setEmpresa(null);
    setCliente(null);
    localStorage.removeItem(EMPRESA_KEY);
    localStorage.removeItem(CLIENTE_KEY);
  };

  return (
    <SessaoContext.Provider value={{ empresa, cliente, entrar, setIdCliente, sair }}>
      {children}
    </SessaoContext.Provider>
  );
}

export function useSessao() {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error('useSessao deve ser usado dentro de SessaoProvider');
  return ctx;
}