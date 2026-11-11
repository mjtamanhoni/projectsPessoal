import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { obterConfig, type ConfigApp } from '../data';

interface ConfigState {
  config: ConfigApp | null;
  carregando: boolean;
  recarregar: () => Promise<void>;
}

const ConfigContext = createContext<ConfigState | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigApp | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      setConfig(await obterConfig());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return (
    <ConfigContext.Provider value={{ config, carregando, recarregar }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig deve ser usado dentro de ConfigProvider');
  return ctx;
}
