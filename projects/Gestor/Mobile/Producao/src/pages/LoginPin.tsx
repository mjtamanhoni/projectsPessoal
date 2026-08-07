import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUltimoLogin, useAuth } from '../auth';
import { extrairErro, listarEmpresas, type EmpresaPublic } from '../api';
import { LogoBox, AuthTitle, EmpresaField, AuthFooter } from '../components/auth';

const DOT_OFFSETS = [61, 105, 149, 193];

export default function LoginPin() {
  const navigate = useNavigate();
  const { loginPin } = useAuth();
  const [empresas, setEmpresas] = useState<EmpresaPublic[]>([]);
  const [empresaId, setEmpresaId] = useState(0);
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listarEmpresas()
      .then((lista) => {
        setEmpresas(lista);
        const ultimo = getUltimoLogin();
        if (ultimo?.tipo === 'login') {
          navigate('/login', { replace: true });
          return;
        }
        if (lista.length > 0) {
          if (ultimo?.empresaId && lista.some((e) => e.id === ultimo.empresaId)) {
            setEmpresaId(ultimo.empresaId);
          } else {
            setEmpresaId(lista[0].id);
          }
        }
      })
      .catch(() => setEmpresas([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nomeEmpresa = (id: number) => {
    const e = empresas.find((x) => x.id === id);
    return e ? e.fantasia || e.razao_social : 'Empresa';
  };

  const autenticar = async (valor: string) => {
    if (loading) return;
    setErro('');
    if (valor.length < 4) {
      setErro('Informe o PIN (4 dígitos)');
      return;
    }
    const emp = empresas.length > 0 ? empresaId || empresas[0].id : parseInt(codigo || '1', 10);
    const empData = empresas.find((x) => x.id === emp) ?? { id: emp, razao_social: nomeEmpresa(emp), fantasia: '' };
    setLoading(true);
    try {
      await loginPin(emp, valor, empData);
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
        <EmpresaField
          empresas={empresas}
          empresaId={empresaId}
          onEmpresaId={setEmpresaId}
          codigo={codigo}
          onCodigo={setCodigo}
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
          style={{ top: 280, left: 0, width: 350, position: 'absolute' }}
          onClick={() => navigate('/login')}
        >
          Usar login e senha
        </button>
      </div>

      <AuthFooter onServerConfig={() => navigate('/server-config')} />
    </div>
  );
}
