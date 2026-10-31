import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { extrairErro, getServerConfig, VERSAO_APP } from '../api';
import { getUltimoCnpj, salvarUltimoCnpj, useAuth } from '../auth';
import { mascaraCpfCnpj } from '../format';
import { Modal } from '../components/Modal';
import { ServerConfigForm } from '../components/ServerConfigForm';
import {
  BuildingIcon,
  EyeIcon,
  EyeOffIcon,
  ReceiptIcon,
  ServerIcon,
} from '../components/Icons';

export function Login() {
  const navigate = useNavigate();
  const { autenticado, login } = useAuth();
  const [cnpjCpf, setCnpjCpf] = useState(() => getUltimoCnpj());
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [servidorAberto, setServidorAberto] = useState(false);
  const [servidor, setServidor] = useState(() => getServerConfig());

  if (autenticado) return <Navigate to="/titulos" replace />;

  const entrar = async () => {
    setErro('');
    if (!cnpjCpf.trim() || !usuario.trim() || !senha.trim()) {
      setErro('Informe o CNPJ/CPF da empresa, o usuário e a senha.');
      return;
    }
    setLoading(true);
    try {
      await login(cnpjCpf, usuario.trim(), senha);
      salvarUltimoCnpj(cnpjCpf);
      navigate('/titulos', { replace: true });
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen login-screen">
      <div className="screen-glow" />

      <header className="login-header">
        <div className="brand-mark">
          <ReceiptIcon size={34} />
        </div>
        <h1>Títulos a Pagar</h1>
        <p>Acesse sua conta para acompanhar as contas.</p>
      </header>

      <main className="login-card">
        <label className="field">
          <span>
            <BuildingIcon size={15} /> CNPJ/CPF da empresa
          </span>
          <input
            className="input"
            inputMode="numeric"
            placeholder="Digite o CNPJ/CPF da empresa"
            value={cnpjCpf}
            onChange={(event) => setCnpjCpf(mascaraCpfCnpj(event.target.value))}
            autoComplete="organization"
          />
        </label>

        <label className="field">
          <span>Usuário</span>
          <input
            className="input"
            placeholder="Usuário ou e-mail"
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>

        <label className="field">
          <span>Senha</span>
          <div className="input-with-action">
            <input
              className="input"
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === 'Enter') void entrar();
              }}
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setMostrarSenha((value) => !value)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
            </button>
          </div>
        </label>

        {erro && <p className="form-error">{erro}</p>}

        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={() => void entrar()}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => setServidorAberto(true)}
        >
          <ServerIcon size={18} />
          Servidor: {servidor.host}:{servidor.port}
        </button>
      </main>

      <footer className="login-footer">
        <span>v{VERSAO_APP}</span>
        <span>Gestão financeira</span>
      </footer>

      {servidorAberto && (
        <Modal
          title="Configurações do servidor"
          subtitle="O app tenta os endereços na ordem informada."
          onClose={() => setServidorAberto(false)}
        >
          <ServerConfigForm
            onSaved={() => {
              setServidor(getServerConfig());
              setServidorAberto(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
