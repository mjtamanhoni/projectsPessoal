import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Login from './pages/Login';
import LoginPin from './pages/LoginPin';
import Dashboard from './pages/Dashboard';
import MenuPrincipal from './pages/MenuPrincipal';
import Cadastro from './pages/Cadastro';
import Movimento from './pages/Movimento';
import Relatorios from './pages/Relatorios';
import Ajuda from './pages/Ajuda';
import EmBreve from './pages/EmBreve';
import ServerConfig from './pages/ServerConfig';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { autenticado } = useAuth();
  if (!autenticado) return <Navigate to="/login?expired=1&message=Sessão expirada. Faça login novamente." replace />;
  return <>{children}</>;
}

function SessaoExpirada() {
  const [params] = useSearchParams();
  const expired = params.get('expired') === '1';
  const message = params.get('message') ?? 'Sessão expirada. Faça login novamente.';
  if (!expired) return null;
  return (
    <div style={{ position: 'absolute', left: 0, top: 80, width: 390, textAlign: 'center', fontSize: 11, color: '#c0392b', zIndex: 50 }}>
      {message}
    </div>
  );
}

function Router() {
  const { autenticado, logout } = useAuth();
  const navigate = useNavigate();
  const [boot, setBoot] = useState(false);

  useEffect(() => {
    localStorage.removeItem('producao.token');
    localStorage.removeItem('producao.user');
    localStorage.removeItem('producao.empresaNome');
    navigate('/login', { replace: true });
    setBoot(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      logout();
      navigate('/login?expired=1&message=Sessão expirada. Faça login novamente.');
    };
    window.addEventListener('producao:unauthorized', onUnauthorized);
    return () => window.removeEventListener('producao:unauthorized', onUnauthorized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!boot) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <>
            <SessaoExpirada />
            {autenticado ? <Navigate to="/dashboard" replace /> : <Login />}
          </>
        }
      />
      <Route
        path="/login-pin"
        element={autenticado ? <Navigate to="/dashboard" replace /> : <LoginPin />}
      />
      <Route
        path="/server-config"
        element={autenticado ? <Navigate to="/dashboard" replace /> : <ServerConfig />}
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/menu"
        element={
          <RequireAuth>
            <MenuPrincipal />
          </RequireAuth>
        }
      />
      <Route
        path="/cadastro"
        element={
          <RequireAuth>
            <Cadastro />
          </RequireAuth>
        }
      />
      <Route
        path="/movimento"
        element={
          <RequireAuth>
            <Movimento />
          </RequireAuth>
        }
      />
      <Route
        path="/relatorios"
        element={
          <RequireAuth>
            <Relatorios />
          </RequireAuth>
        }
      />
      <Route
        path="/ajuda"
        element={
          <RequireAuth>
            <Ajuda />
          </RequireAuth>
        }
      />
      <Route
        path="/em-breve"
        element={
          <RequireAuth>
            <EmBreve />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={autenticado ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Router />
      </HashRouter>
    </AuthProvider>
  );
}
