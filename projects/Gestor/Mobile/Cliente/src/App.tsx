import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessaoProvider, useSessao } from './auth';
import Aguarde from './components/Aguarde';
import Cadastro from './pages/Cadastro';
import Entrada from './pages/Entrada';
import MinhasEncomendas from './pages/MinhasEncomendas';
import Pedido from './pages/Pedido';
import ServerConfig from './pages/ServerConfig';

function RequerSessao({ children }: { children: JSX.Element }) {
  const { empresa, cliente } = useSessao();
  if (!empresa || !cliente) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <SessaoProvider>
        <Routes>
          <Route path="/" element={<Entrada />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route
            path="/pedido"
            element={
              <RequerSessao>
                <Pedido />
              </RequerSessao>
            }
          />
          <Route
            path="/minhas-encomendas"
            element={
              <RequerSessao>
                <MinhasEncomendas />
              </RequerSessao>
            }
          />
          <Route path="/server-config" element={<ServerConfig />} />
        </Routes>
        <Aguarde />
      </SessaoProvider>
    </HashRouter>
  );
}