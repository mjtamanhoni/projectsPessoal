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
import RelatorioInsumos from './pages/RelatorioInsumos';
import RelatorioProdutosFabricados from './pages/RelatorioProdutosFabricados';
import RelatorioFabricacoes from './pages/RelatorioFabricacoes';
import RelatorioVendasProduto from './pages/RelatorioVendasProduto';
import Ajuda from './pages/Ajuda';
import EmBreve from './pages/EmBreve';
import Insumos from './pages/Insumos';
import Marcas from './pages/Marcas';
import ComprasInsumo from './pages/ComprasInsumo';
import VendasProduto from './pages/VendasProduto';
import Encomendas from './pages/Encomendas';
import EstoqueInsumo from './pages/EstoqueInsumo';
import EstoqueProduto from './pages/EstoqueProduto';
import PerdasInsumo from './pages/PerdasInsumo';
import PerdasProduto from './pages/PerdasProduto';
import UsoConsumo from './pages/UsoConsumo';
import CustosAdicionais from './pages/CustosAdicionais';
import Clientes from './pages/Clientes';
import Fornecedores from './pages/Fornecedores';
import ProdutosFabricados from './pages/ProdutosFabricados';
import Ingredientes from './pages/Ingredientes';
import Fabricacoes from './pages/Fabricacoes';
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
        path="/relatorio-insumos"
        element={
          <RequireAuth>
            <RelatorioInsumos />
          </RequireAuth>
        }
      />
      <Route
        path="/relatorio-produtos-fabricados"
        element={
          <RequireAuth>
            <RelatorioProdutosFabricados />
          </RequireAuth>
        }
      />
      <Route
        path="/relatorio-fabricacoes"
        element={
          <RequireAuth>
            <RelatorioFabricacoes />
          </RequireAuth>
        }
      />
      <Route
        path="/relatorio-vendas-produto"
        element={
          <RequireAuth>
            <RelatorioVendasProduto />
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
      <Route
        path="/insumos"
        element={
          <RequireAuth>
            <Insumos />
          </RequireAuth>
        }
      />
      <Route
        path="/compras-insumo"
        element={
          <RequireAuth>
            <ComprasInsumo />
          </RequireAuth>
        }
      />
      <Route
        path="/vendas-produto"
        element={
          <RequireAuth>
            <VendasProduto />
          </RequireAuth>
        }
      />
      <Route
        path="/encomendas"
        element={
          <RequireAuth>
            <Encomendas />
          </RequireAuth>
        }
      />
      <Route
        path="/estoque-insumo"
        element={
          <RequireAuth>
            <EstoqueInsumo />
          </RequireAuth>
        }
      />
      <Route
        path="/estoque-produto"
        element={
          <RequireAuth>
            <EstoqueProduto />
          </RequireAuth>
        }
      />
      <Route
        path="/perdas-insumo"
        element={
          <RequireAuth>
            <PerdasInsumo />
          </RequireAuth>
        }
      />
      <Route
        path="/perdas-produto"
        element={
          <RequireAuth>
            <PerdasProduto />
          </RequireAuth>
        }
      />
      <Route
        path="/uso-consumo"
        element={
          <RequireAuth>
            <UsoConsumo />
          </RequireAuth>
        }
      />
      <Route
        path="/marcas"
        element={
          <RequireAuth>
            <Marcas />
          </RequireAuth>
        }
      />
      <Route
        path="/custos-adicionais"
        element={
          <RequireAuth>
            <CustosAdicionais />
          </RequireAuth>
        }
      />
      <Route
        path="/clientes"
        element={
          <RequireAuth>
            <Clientes />
          </RequireAuth>
        }
      />
      <Route
        path="/fornecedores"
        element={
          <RequireAuth>
            <Fornecedores />
          </RequireAuth>
        }
      />
      <Route
        path="/produtos-fabricados"
        element={
          <RequireAuth>
            <ProdutosFabricados />
          </RequireAuth>
        }
      />
      <Route
        path="/ingredientes/:produtoId"
        element={
          <RequireAuth>
            <Ingredientes />
          </RequireAuth>
        }
      />
      <Route
        path="/fabricacoes"
        element={
          <RequireAuth>
            <Fabricacoes />
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
