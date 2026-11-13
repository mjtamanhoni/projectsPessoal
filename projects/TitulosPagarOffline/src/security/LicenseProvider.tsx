import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ativarLicenca,
  obterStatusLicenca,
  removerLicenca,
  type LicencaStatus,
} from '../data/licenca';
import { extrairErro } from '../data/erros';

interface LicenseState {
  status: LicencaStatus | null;
  carregando: boolean;
  erro: string;
  recarregar: () => Promise<void>;
  ativar: (token: string) => Promise<LicencaStatus>;
  remover: () => Promise<void>;
}

const LicenseContext = createContext<LicenseState | null>(null);

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LicencaStatus | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setStatus(await obterStatusLicenca());
      setErro('');
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const ativar = useCallback(async (token: string) => {
    const novo = await ativarLicenca(token);
    setStatus(novo);
    setErro('');
    return novo;
  }, []);

  const remover = useCallback(async () => {
    const novo = await removerLicenca();
    setStatus(novo);
    setErro('');
  }, []);

  return (
    <LicenseContext.Provider
      value={{ status, carregando, erro, recarregar, ativar, remover }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error('useLicense deve ser usado dentro de LicenseProvider');
  return ctx;
}
