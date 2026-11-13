import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LockProvider, useLock } from './security/LockProvider';
import { ConfigProvider } from './security/ConfigProvider';
import { LicenseProvider } from './security/LicenseProvider';
import { SplashScreen } from './components/SplashScreen';
import { Lock } from './pages/Lock';
import { Dashboard } from './pages/Dashboard';
import { Titulos } from './pages/Titulos';
import { Configuracoes } from './pages/Configuracoes';

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

  return (
    <>
      {splashVisivel && <SplashScreen onFinalizar={finalizarSplash} />}
      <HashRouter>
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
