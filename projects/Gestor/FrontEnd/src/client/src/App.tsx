import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppMode } from '@/context/AppModeContext';
import { ModuleProvider } from '@/context/ModuleContext';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { hasServerConfig } from '@/lib/serverConfig';

const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })));
const ModuloSelector = lazy(() => import('@/pages/ModuloSelector').then((m) => ({ default: m.ModuloSelector })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Clientes = lazy(() => import('@/pages/Clientes').then((m) => ({ default: m.Clientes })));
const Fornecedores = lazy(() => import('@/pages/Fornecedores').then((m) => ({ default: m.Fornecedores })));
const ContasPagar = lazy(() => import('@/pages/ContasPagar').then((m) => ({ default: m.ContasPagar })));
const ContasReceber = lazy(() => import('@/pages/ContasReceber').then((m) => ({ default: m.ContasReceber })));
const Categorias = lazy(() => import('@/pages/Categorias').then((m) => ({ default: m.Categorias })));
const Relatorios = lazy(() => import('@/pages/Relatorios').then((m) => ({ default: m.Relatorios })));
const RelatorioFinanceiro = lazy(() => import('@/pages/RelatorioFinanceiro').then((m) => ({ default: m.RelatorioFinanceiro })));
const RelatorioClientes = lazy(() => import('@/pages/RelatorioClientes').then((m) => ({ default: m.RelatorioClientes })));
const RelatorioFornecedores = lazy(() => import('@/pages/RelatorioFornecedores').then((m) => ({ default: m.RelatorioFornecedores })));
const RelatorioCategorias = lazy(() => import('@/pages/RelatorioCategorias').then((m) => ({ default: m.RelatorioCategorias })));
const RelatorioUsuarios = lazy(() => import('@/pages/RelatorioUsuarios').then((m) => ({ default: m.RelatorioUsuarios })));
const RelatorioFormularios = lazy(() => import('@/pages/RelatorioFormularios').then((m) => ({ default: m.RelatorioFormularios })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const Usuarios = lazy(() => import('@/pages/Usuarios').then((m) => ({ default: m.Usuarios })));
const Formularios = lazy(() => import('@/pages/Formularios').then((m) => ({ default: m.Formularios })));
const Empresas = lazy(() => import('@/pages/Empresas').then((m) => ({ default: m.Empresas })));
const UsuarioFormularios = lazy(() => import('@/pages/UsuarioFormularios').then((m) => ({ default: m.UsuarioFormularios })));
const HorasTrabalhadas = lazy(() => import('@/pages/HorasTrabalhadas').then((m) => ({ default: m.HorasTrabalhadas })));
const HorasDashboard = lazy(() => import('@/pages/HorasDashboard').then((m) => ({ default: m.HorasDashboard })));
const ProducaoDashboard = lazy(() => import('@/pages/ProducaoDashboard').then((m) => ({ default: m.ProducaoDashboard })));
const Abatimentos = lazy(() => import('@/pages/Abatimentos').then((m) => ({ default: m.Abatimentos })));
const HorasExcedidas = lazy(() => import('@/pages/HorasExcedidas').then((m) => ({ default: m.HorasExcedidas })));
const Servicos = lazy(() => import('@/pages/Servicos').then((m) => ({ default: m.Servicos })));
const PermissoesFormulario = lazy(() => import('@/pages/PermissoesFormulario').then((m) => ({ default: m.PermissoesFormulario })));

const Insumos = lazy(() => import('@/pages/Insumos').then((m) => ({ default: m.Insumos })));
const ComprasInsumo = lazy(() => import('@/pages/ComprasInsumo').then((m) => ({ default: m.ComprasInsumo })));
const ProdutosFabricados = lazy(() => import('@/pages/ProdutosFabricados').then((m) => ({ default: m.ProdutosFabricados })));
const CustosAdicionais = lazy(() => import('@/pages/CustosAdicionais').then((m) => ({ default: m.CustosAdicionais })));
const Adicionais = lazy(() => import('@/pages/Adicionais').then((m) => ({ default: m.Adicionais })));
const ProdutosVenda = lazy(() => import('@/pages/ProdutosVenda').then((m) => ({ default: m.ProdutosVenda })));
const Fabricacoes = lazy(() => import('@/pages/Fabricacoes').then((m) => ({ default: m.Fabricacoes })));
const VendasProduto = lazy(() => import('@/pages/VendasProduto').then((m) => ({ default: m.VendasProduto })));
const Encomendas = lazy(() => import('@/pages/Encomendas').then((m) => ({ default: m.Encomendas })));
const ReceitasIngredientes = lazy(() => import('@/pages/ReceitasIngredientes').then((m) => ({ default: m.ReceitasIngredientes })));
const EstoqueInsumo = lazy(() => import('@/pages/EstoqueInsumo').then((m) => ({ default: m.EstoqueInsumo })));
const EstoqueProduto = lazy(() => import('@/pages/EstoqueProduto').then((m) => ({ default: m.EstoqueProduto })));
const Modulos = lazy(() => import('@/pages/Modulos').then((m) => ({ default: m.Modulos })));
const ModuloFormularios = lazy(() => import('@/pages/ModuloFormularios').then((m) => ({ default: m.ModuloFormularios })));
const EmpresaModulos = lazy(() => import('@/pages/EmpresaModulos').then((m) => ({ default: m.EmpresaModulos })));
const RelatorioInsumos = lazy(() => import('@/pages/RelatorioInsumos').then((m) => ({ default: m.RelatorioInsumos })));
const RelatorioProdutosFabricados = lazy(() => import('@/pages/RelatorioProdutosFabricados').then((m) => ({ default: m.RelatorioProdutosFabricados })));
const RelatorioFabricacoes = lazy(() => import('@/pages/RelatorioFabricacoes').then((m) => ({ default: m.RelatorioFabricacoes })));
const LancamentoAutomaticoConfigPage = lazy(() => import('@/pages/LancamentoAutomaticoConfig').then((m) => ({ default: m.LancamentoAutomaticoConfigPage })));
const PerdasInsumo = lazy(() => import('@/pages/PerdasInsumo').then((m) => ({ default: m.PerdasInsumo })));
const PerdasProduto = lazy(() => import('@/pages/PerdasProduto').then((m) => ({ default: m.PerdasProduto })));
const UsoConsumoPage = lazy(() => import('@/pages/UsoConsumo').then((m) => ({ default: m.UsoConsumoPage })));
const RelatorioVendasProduto = lazy(() => import('@/pages/RelatorioVendasProduto').then((m) => ({ default: m.RelatorioVendasProduto })));
const Marcas = lazy(() => import('@/pages/Marcas').then((m) => ({ default: m.Marcas })));
const Help = lazy(() => import('@/pages/Help').then((m) => ({ default: m.Help })));
const ServerConfigPage = lazy(() => import('@/pages/ServerConfig').then((m) => ({ default: m.ServerConfig })));

const superadminRoutes = new Set([
  '/modulos',
  '/formularios',
  '/modulo-formularios',
  '/empresa-modulos',
  '/empresas',
  '/relatorios/cadastros/formularios',
]);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, temAcesso, isSuperadmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner fullPage />;
  }

  if (!isAuthenticated) {
    try { localStorage.setItem('redirectAfterLogin', location.pathname); } catch {}
    return <Navigate to="/login" replace />;
  }

  if (location.pathname !== '/' && !temAcesso(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  if (superadminRoutes.has(location.pathname) && !isSuperadmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function Private({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary><PrivateRoute>{children}</PrivateRoute></ErrorBoundary>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Spinner fullPage />;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

function ConfigGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!hasServerConfig() && location.pathname !== '/server-config') {
    return <Navigate to="/server-config" replace />;
  }
  return <>{children}</>;
}

const SHARED = 1;
const GESTOR = 2;
const HORAS = 4;
const PRODUCAO = 8;

function routesFor(mask: number, mode: string): boolean {
  if (!mode) return true;
  return (mask & (mode === 'gestor' ? GESTOR : mode === 'horas' ? HORAS : PRODUCAO)) !== 0;
}

export default function App() {
  const mode = useAppMode();

  return (
    <ConfigGuard>
    <ModuleProvider>
      <Suspense fallback={<Spinner fullPage />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/server-config" element={<ServerConfigPage />} />
          <Route path="/" element={<Private><ModuloSelector /></Private>} />
          {routesFor(SHARED, mode) && <Route path="/dashboard" element={<Private><Dashboard /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/relatorios/cadastros/usuarios" element={<Private><RelatorioUsuarios /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/relatorios/cadastros/formularios" element={<Private><RelatorioFormularios /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/settings" element={<Private><Settings /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/usuarios" element={<Private><Usuarios /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/formularios" element={<Private><Formularios /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/usuario-formularios" element={<Private><UsuarioFormularios /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/permissoes-formulario" element={<Private><PermissoesFormulario /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/empresas" element={<Private><Empresas /></Private>} />}

          {routesFor(SHARED, mode) && <Route path="/modulos" element={<Private><Modulos /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/modulo-formularios" element={<Private><ModuloFormularios /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/empresa-modulos" element={<Private><EmpresaModulos /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/help" element={<Private><Help /></Private>} />}
          {/* gestor */}
          {routesFor(GESTOR, mode) && <Route path="/clientes" element={<Private><Clientes /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/fornecedores" element={<Private><Fornecedores /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/contas-pagar" element={<Private><ContasPagar /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/contas-receber" element={<Private><ContasReceber /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/categorias" element={<Private><Categorias /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/relatorios" element={<Private><Relatorios /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/relatorios/financeiro" element={<Private><RelatorioFinanceiro /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/relatorios/cadastros/clientes" element={<Private><RelatorioClientes /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/relatorios/cadastros/fornecedores" element={<Private><RelatorioFornecedores /></Private>} />}
          {routesFor(GESTOR, mode) && <Route path="/relatorios/cadastros/categorias" element={<Private><RelatorioCategorias /></Private>} />}
          {/* horas */}
          {routesFor(HORAS, mode) && <Route path="/horas-trabalhadas" element={<Private><HorasTrabalhadas /></Private>} />}
          {routesFor(HORAS, mode) && <Route path="/horas-dashboard" element={<Private><HorasDashboard /></Private>} />}
          {routesFor(HORAS, mode) && <Route path="/excedidas" element={<Private><HorasExcedidas /></Private>} />}
          {routesFor(HORAS, mode) && <Route path="/abatimentos" element={<Private><Abatimentos /></Private>} />}
          {routesFor(HORAS, mode) && <Route path="/servicos" element={<Private><Servicos /></Private>} />}
          {/* producao */}
          {routesFor(PRODUCAO, mode) && <Route path="/producao-dashboard" element={<Private><ProducaoDashboard /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/insumos" element={<Private><Insumos /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/marcas" element={<Private><Marcas /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/compras-insumo" element={<Private><ComprasInsumo /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/produtos-fabricados" element={<Private><ProdutosFabricados /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/custos-adicionais" element={<Private><CustosAdicionais /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/adicionais" element={<Private><Adicionais /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/produtos-venda" element={<Private><ProdutosVenda /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/fabricacoes" element={<Private><Fabricacoes /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/vendas-produto" element={<Private><VendasProduto /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/encomendas" element={<Private><Encomendas /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/receitas-ingredientes" element={<Private><ReceitasIngredientes /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/estoque-insumo" element={<Private><EstoqueInsumo /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/estoque-produto" element={<Private><EstoqueProduto /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/relatorios/producao/insumos" element={<Private><RelatorioInsumos /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/relatorios/producao/produtos-fabricados" element={<Private><RelatorioProdutosFabricados /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/relatorios/producao/fabricacoes" element={<Private><RelatorioFabricacoes /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/relatorios/producao/vendas-produto" element={<Private><RelatorioVendasProduto /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/perdas-insumo" element={<Private><PerdasInsumo /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/perdas-produto" element={<Private><PerdasProduto /></Private>} />}
          {routesFor(PRODUCAO, mode) && <Route path="/uso-consumo" element={<Private><UsoConsumoPage /></Private>} />}
          {routesFor(SHARED, mode) && <Route path="/lancamento-automatico-config" element={<Private><LancamentoAutomaticoConfigPage /></Private>} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ModuleProvider>
    </ConfigGuard>
  );
}
