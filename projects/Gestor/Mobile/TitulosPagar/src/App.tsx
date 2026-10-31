import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { SplashScreen } from './components/SplashScreen';
import { Login } from './pages/Login';
import { Titulos } from './pages/Titulos';
import { Configuracoes } from './pages/Configuracoes';

function RequireAuth({ children }: { children: ReactElement }) {
  const { autenticado } = useAuth();
  if (!autenticado) return <Navigate to="/login" replace />;
  return children;
}

function HomeRedirect() {
  const { autenticado } = useAuth();
  return <Navigate to={autenticado ? '/titulos' : '/login'} replace />;
}

export default function App() {
  const [splashVisivel, setSplashVisivel] = useState(true);
  const finalizarSplash = useCallback(() => setSplashVisivel(false), []);

  return (
    <AuthProvider>
      {splashVisivel && <SplashScreen onFinalizar={finalizarSplash} />}
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/titulos"
            element={
              <RequireAuth>
                <Titulos />
              </RequireAuth>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <RequireAuth>
                <Configuracoes />
              </RequireAuth>
            }
          />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
