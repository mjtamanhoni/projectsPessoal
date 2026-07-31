import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { extrairErro, listarEmpresas, type EmpresaPublic } from '../api';
import { LogoBox, AuthTitle, EmpresaField, AuthFooter } from '../components/auth';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [empresas, setEmpresas] = useState<EmpresaPublic[]>([]);
  const [empresaId, setEmpresaId] = useState(0);
  const [codigo, setCodigo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listarEmpresas()
      .then((lista) => {
        setEmpresas(lista);
        if (lista.length > 0) setEmpresaId(lista[0].id);
      })
      .catch(() => setEmpresas([]));
  }, []);

  const nomeEmpresa = (id: number) => {
    const e = empresas.find((x) => x.id === id);
    return e ? e.fantasia || e.razao_social : 'Empresa';
  };

  const entrar = async () => {
    setErro('');
    if (!usuario.trim() || !senha.trim()) {
      setErro('Informe usuário e senha');
      return;
    }
    const emp = empresas.length > 0 ? empresaId || empresas[0].id : parseInt(codigo || '1', 10);
    setLoading(true);
    try {
      await login(emp, usuario.trim(), senha, nomeEmpresa(emp));
      navigate('/dashboard');
    } catch (e) {
      setErro(extrairErro(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <LogoBox />
      <AuthTitle subtitle="Acesse sua conta" />

      <div className="auth-card" style={{ height: 380 }}>
        <EmpresaField
          empresas={empresas}
          empresaId={empresaId}
          onEmpresaId={setEmpresaId}
          codigo={codigo}
          onCodigo={setCodigo}
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
          style={{ top: 342, left: 0, width: 350, position: 'absolute' }}
          onClick={() => navigate('/login-pin')}
        >
          Entrar com PIN
        </button>
      </div>

      <AuthFooter onServerConfig={() => navigate('/server-config')} />
    </div>
  );
}
