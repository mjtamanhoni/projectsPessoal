import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUltimoLogin, useAuth } from '../auth';
import { extrairErro } from '../api';
import { LogoBox, AuthTitle, AuthFooter } from '../components/auth';

const DOT_OFFSETS = [61, 105, 149, 193];

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

export default function LoginPin() {
  const navigate = useNavigate();
  const { loginPin } = useAuth();
  const [cnpjCpf, setCnpjCpf] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ultimo = getUltimoLogin();
    if (ultimo?.tipo === 'login') {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const last = localStorage.getItem('producao.ultimoCnpj');
      if (last) setCnpjCpf(last);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autenticar = async (valor: string) => {
    if (loading) return;
    setErro('');
    if (valor.length < 4) {
      setErro('Informe o PIN (4 dígitos)');
      return;
    }
    if (!cnpjCpf.trim()) {
      setErro('Informe o CNPJ/CPF da empresa');
      return;
    }
    setLoading(true);
    try {
      await loginPin(cnpjCpf, valor);
      try { localStorage.setItem('producao.ultimoCnpj', cnpjCpf); } catch {}
      navigate('/dashboard');
    } catch (e) {
      setErro(extrairErro(e));
      setPin('');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <LogoBox />
      <AuthTitle subtitle="Acesse com seu PIN" />

      <div className="auth-card" style={{ height: 340 }}>
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
          PIN
        </div>
        <div
          className="field-select"
          style={{ top: 120, height: 60, padding: 0 }}
          onClick={() => document.getElementById('pin-input')?.focus()}
        >
          {DOT_OFFSETS.map((left, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left,
                top: 23,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: i < pin.length ? '#1b1f1c' : '#ffffff',
                border: i < pin.length ? 'none' : '1px solid #d6ddd0',
              }}
            />
          ))}
        </div>
        <input
          id="pin-input"
          className="field-input"
          style={{ top: 120, opacity: 0, zIndex: 10 }}
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(v);
            setErro('');
            if (v.length === 4) autenticar(v);
          }}
          autoFocus
        />
        {erro && (
          <div style={{ position: 'absolute', left: 20, top: 196, fontSize: 11, color: '#c0392b' }}>
            {erro}
          </div>
        )}

        <button className="green-button" style={{ top: 210 }} onClick={() => autenticar(pin)} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <button
          className="link-button"
          style={{ top: 280, left: 0, width: '100%', position: 'absolute' }}
          onClick={() => navigate('/login')}
        >
          Usar login e senha
        </button>
      </div>

      <AuthFooter onServerConfig={() => navigate('/server-config')} />
    </div>
  );
}
