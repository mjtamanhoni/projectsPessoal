import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { definirPin, obterConfig, verificarPin } from '../data';
import { autenticarBiometria, biometriaDisponivel } from './biometria';

export type EstadoBloqueio = 'carregando' | 'primeiro-uso' | 'bloqueado' | 'desbloqueado';

interface LockState {
  estado: EstadoBloqueio;
  temPin: boolean;
  biometriaDisponivel: boolean;
  biometriaAtiva: boolean;
  criarPin: (pin: string) => Promise<void>;
  desbloquear: (pin: string) => Promise<boolean>;
  desbloquearComBiometria: () => Promise<boolean>;
  pularPin: () => void;
  bloquear: () => void;
  atualizarEstado: () => Promise<void>;
}

const LockContext = createContext<LockState | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoBloqueio>('carregando');
  const [temPin, setTemPin] = useState(false);
  const [biometriaOk, setBiometriaOk] = useState(false);
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);

  const temPinRef = useRef(false);
  const estadoRef = useRef<EstadoBloqueio>('carregando');

  temPinRef.current = temPin;
  estadoRef.current = estado;

  const atualizarEstado = useCallback(async () => {
    const config = await obterConfig();
    const possuiPin = Boolean(config.pin_hash && config.pin_salt);
    setTemPin(possuiPin);
    setBiometriaAtiva(config.biometria);
    temPinRef.current = possuiPin;
    setEstado((atual) => {
      if (atual === 'desbloqueado' && possuiPin) return atual;
      return possuiPin ? 'bloqueado' : 'primeiro-uso';
    });
  }, []);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        await atualizarEstado();
      } finally {
        if (ativo) {
          setEstado((atual) => (atual === 'carregando' ? 'primeiro-uso' : atual));
        }
      }
      const disponivel = await biometriaDisponivel();
      if (ativo) setBiometriaOk(disponivel);
    })();
    return () => {
      ativo = false;
    };
  }, [atualizarEstado]);

  useEffect(() => {
    let cancelado = false;
    let remover: (() => Promise<void>) | null = null;

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && temPinRef.current && estadoRef.current === 'desbloqueado') {
        setEstado('bloqueado');
      }
    }).then((handle) => {
      if (cancelado) {
        void handle.remove();
      } else {
        remover = () => handle.remove();
      }
    });

    return () => {
      cancelado = true;
      if (remover) void remover();
    };
  }, []);

  const criarPin = useCallback(async (pin: string) => {
    await definirPin(pin);
    const salvo = await verificarPin(pin);
    if (!salvo) {
      throw new Error('Nao foi possivel salvar o PIN. Tente novamente.');
    }
    setTemPin(true);
    temPinRef.current = true;
    setEstado('desbloqueado');
  }, []);

  const desbloquear = useCallback(async (pin: string) => {
    const ok = await verificarPin(pin);
    if (ok) setEstado('desbloqueado');
    return ok;
  }, []);

  const desbloquearComBiometria = useCallback(async () => {
    if (!biometriaAtiva) return false;
    const ok = await autenticarBiometria();
    if (ok) setEstado('desbloqueado');
    return ok;
  }, [biometriaAtiva]);

  const pularPin = useCallback(() => {
    setEstado('desbloqueado');
  }, []);

  const bloquear = useCallback(() => {
    if (temPinRef.current) setEstado('bloqueado');
  }, []);

  return (
    <LockContext.Provider
      value={{
        estado,
        temPin,
        biometriaDisponivel: biometriaOk,
        biometriaAtiva,
        criarPin,
        desbloquear,
        desbloquearComBiometria,
        pularPin,
        bloquear,
        atualizarEstado,
      }}
    >
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock deve ser usado dentro de LockProvider');
  return ctx;
}
