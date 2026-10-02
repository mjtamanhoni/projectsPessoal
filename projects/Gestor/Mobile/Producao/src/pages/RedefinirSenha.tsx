import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServerConfig } from '../api';
import { AuthTitle } from '../components/auth';

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

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [cnpjCpf, setCnpjCpf] = useState(() => {
    try { return localStorage.getItem('producao.ultimoCnpj') || ''; } catch { return ''; }
  });
  const [usuario, setUsuario] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);

  const redefinir = async () => {
    setErro('');
    setSucesso('');
    if (!cnpjCpf.trim() || !usuario.trim() || !senhaAtual.trim() || !novaSenha.trim()) {
      setErro('Todos os campos são obrigatórios');
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem');
      return;
    }
    if (novaSenha.length < 4) {
      setErro('A nova senha deve ter pelo menos 4 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { host, port } = getServerConfig();
      const res = await fetch(`http://${host}:${port}/usuario/redefinirSenha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: usuario.trim(),
          empresa: cnpjCpf.trim(),
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.erro || `Erro ${res.status}`);
      }
      setSucesso('Senha redefinida com sucesso! Agora faça login.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmar('');
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="screen">
        <AuthTitle subtitle="Senha redefinida" />
        <div className="auth-card" style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ fontSize: 13, color: '#27ae60', textAlign: 'center', marginBottom: 20 }}>
            {sucesso}
          </div>
          <button className="green-button" style={{ position: 'relative', top: 0 }} onClick={() => navigate('/login')}>
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <AuthTitle subtitle="Redefinir sua senha" />

      <div className="auth-card" style={{ height: 480 }}>
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
        />

        <div className="field-label" style={{ top: 182 }}>
          Senha Atual
        </div>
        <input
          className="field-input"
          style={{ top: 202 }}
          type="password"
          placeholder="Digite sua senha atual"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
        />

        <div className="field-label" style={{ top: 264 }}>
          Nova Senha
        </div>
        <input
          className="field-input"
          style={{ top: 284 }}
          type="password"
          placeholder="Digite a nova senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
        />

        <div className="field-label" style={{ top: 346 }}>
          Confirmar Nova Senha
        </div>
        <input
          className="field-input"
          style={{ top: 366 }}
          type="password"
          placeholder="Confirme a nova senha"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') redefinir(); }}
        />

        {erro && (
          <div style={{ position: 'absolute', left: 20, top: 428, fontSize: 11, color: '#c0392b' }}>
            {erro}
          </div>
        )}

        <button className="green-button" style={{ top: 440 }} onClick={redefinir} disabled={loading}>
          {loading ? 'Redefinindo...' : 'Redefinir Senha'}
        </button>

        <button
          className="link-button"
          style={{ top: 510, left: 0, width: '100%', position: 'absolute' }}
          onClick={() => navigate('/login')}
        >
          Voltar ao Login
        </button>
      </div>
    </div>
  );
}
