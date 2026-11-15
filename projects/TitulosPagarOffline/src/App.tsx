import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LockProvider, useLock } from './security/LockProvider';
import { ConfigProvider } from './security/ConfigProvider';
import { LicenseProvider } from './security/LicenseProvider';
import { SplashScreen } from './components/SplashScreen';
import { Lock } from './pages/Lock';
import { Dashboard } from './pages/Dashboard';
import { Titulos } from './pages/Titulos';
import { Configuracoes, CHAVE_ABA_CONFIG } from './pages/Configuracoes';

const CHAVE_ROTA = 'app:rota';

function restaurarRotaSalva() {
  try {
    const salva = window.localStorage.getItem(CHAVE_ROTA);
    const atual = window.location.hash;
    if (salva && (!atual || atual === '#' || atual === '#/')) {
      window.location.hash = salva;
    }
  } catch {}
}

restaurarRotaSalva();

function PersistirRota() {
  const location = useLocation();
  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_ROTA, `#${location.pathname}${location.search}`);
    } catch {}
  }, [location.pathname, location.search]);
  return null;
}

function RequireUnlock({ children }: { children: ReactElement }) {
  const { estado } = useLock();
  if (estado !== 'desbloqueado') return <Navigate to="/lock" replace />;
  return children;
}

function HomeRedirect() {
  const { estado } = useLock();
  return <Navigate to={estado === 'desbloqueado' ? '/dashboard' : '/lock'} replace />;
}

function AppShell() {
  const [splashVisivel, setSplashVisivel] = useState(true);
  const finalizarSplash = useCallback(() => setSplashVisivel(false), []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let ativo = true;
    let remover: (() => Promise<void>) | undefined;
    void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      let naLicenca = false;
      try {
        naLicenca =
          window.location.hash.startsWith('#/configuracoes') &&
          window.localStorage.getItem(CHAVE_ABA_CONFIG) === 'licenca';
      } catch {}
      if (naLicenca) {
        void CapacitorApp.minimizeApp();
        return;
      }
      if (canGoBack) {
        window.history.back();
        return;
      }
      void CapacitorApp.exitApp();
    }).then((handle) => {
      if (ativo) remover = () => handle.remove();
      else void handle.remove();
    });
    return () => {
      ativo = false;
      void remover?.();
    };
  }, []);

  return (
    <>
      {splashVisivel && <SplashScreen onFinalizar={finalizarSplash} />}
      <HashRouter>
        <PersistirRota />
        <Routes>
          <Route path="/lock" element={<Lock />} />
          <Route
            path="/dashboard"
            element={
              <RequireUnlock>
                <Dashboard />
              </RequireUnlock>
            }
          />
          <Route
            path="/titulos"
            element={
              <RequireUnlock>
                <Titulos />
              </RequireUnlock>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <RequireUnlock>
                <Configuracoes />
              </RequireUnlock>
            }
          />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </HashRouter>
    </>
  );
}

export default function App() {
  return (
    <LockProvider>
      <ConfigProvider>
        <LicenseProvider>
          <AppShell />
        </LicenseProvider>
      </ConfigProvider>
    </LockProvider>
  );
}
