import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUltimoLogin, useAuth } from '../auth';
import { extrairErro } from '../api';
import { AuthTitle, AuthFooter } from '../components/auth';

function mascaraCpfCnpj(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  if (numbers.length <= 13) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ultimo = getUltimoLogin();
    if (ultimo?.tipo === 'pin') {
      navigate('/login-pin', { replace: true });
      return;
    }
    if (ultimo?.usuarioNome) setUsuario(ultimo.usuarioNome);
    try {
      const last = localStorage.getItem('producao.ultimoCnpj');
      if (last) setCnpjCpf(last);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entrar = async () => {
    setErro('');
    if (!cnpjCpf.trim() || !usuario.trim() || !senha.trim()) {
      setErro('Informe CNPJ/CPF da empresa, usuário e senha');
      return;
    }
    setLoading(true);
    try {
      await login(cnpjCpf, usuario.trim(), senha);
      try { localStorage.setItem('producao.ultimoCnpj', cnpjCpf); } catch {}
      navigate('/dashboard');
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <AuthTitle subtitle="Acesse sua conta" />

      <div className="auth-card" style={{ height: 380 }}>
        <div className="field-label" style={{ top: 18 }}>
          CNPJ/CPF da Empresa
        </div>
        <input
          className="field-input"
          style={{ top: 38 }}
          type="tel"
          inputMode="numeric"
          placeholder="Digite o CNPJ/CPF da empresa"
          value={cnpjCpf}
          onChange={(e) => setCnpjCpf(mascaraCpfCnpj(e.target.value))}
        />

        <div className="field-label" style={{ top: 100 }}>
          Login
        </div>
        <input
          className="field-input"
          style={{ top: 120 }}
          placeholder="Digite seu usuário ou email"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
        />

        <div className="field-label" style={{ top: 182 }}>
          Senha
        </div>
        <div className="input-with-icon" style={{ position: 'absolute', left: 20, top: 202 }}>
          <input
            className="field-input"
            style={{ position: 'absolute', left: 0, top: 0 }}
            type={mostrarSenha ? 'text' : 'password'}
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') entrar();
            }}
          />
          <button
            className="icon"
            style={{ position: 'absolute', right: 14, top: 13 }}
            onClick={() => setMostrarSenha(!mostrarSenha)}
            tabIndex={-1}
          >
            {mostrarSenha ? '◉' : '○'}
          </button>
        </div>

        {erro && (
          <div style={{ position: 'absolute', left: 20, top: 260, fontSize: 11, color: '#c0392b' }}>
            {erro}
          </div>
        )}

        <button className="green-button" style={{ top: 272 }} onClick={entrar} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <button
          className="link-button"
          style={{ top: 342, left: 0, width: '100%', position: 'absolute' }}
          onClick={() => navigate('/login-pin')}
        >
          Entrar com PIN
        </button>
      </div>

      <AuthFooter onServerConfig={() => navigate('/server-config')} />
    </div>
  );
}
