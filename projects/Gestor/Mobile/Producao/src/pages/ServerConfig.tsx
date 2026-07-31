import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServerConfig, setServerConfig, testServer, extrairErro } from '../api';

export default function ServerConfig() {
  const navigate = useNavigate();
  const cfg = getServerConfig();
  const [host, setHost] = useState(cfg.host);
  const [port, setPort] = useState(String(cfg.port));
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testando, setTestando] = useState(false);

  const testar = async () => {
    setStatus(null);
    if (!host.trim()) {
      setStatus({ ok: false, msg: 'Informe o host do servidor' });
      return;
    }
    const p = parseInt(port || '9000', 10);
    setTestando(true);
    try {
      await testServer(host.trim(), p);
      setServerConfig(host.trim(), p);
      setStatus({ ok: true, msg: `Conectado! Configuração salva (${host.trim()}:${p})` });
    } catch (e) {
      setStatus({ ok: false, msg: extrairErro(e) });
    } finally {
      setTestando(false);
    }
  };

  return (
    <div className="screen">
      <button className="menu-back" onClick={() => navigate(-1)}>
        ←
      </button>
      <div className="dashboard-title" style={{ left: 42, top: 26 }}>
        Servidor do App
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 48 }}>
        Atual: {cfg.host}:{cfg.port}
      </div>

      <div className="auth-card" style={{ top: 90, height: 220 }}>
        <div className="field-label" style={{ top: 18 }}>
          Host / IP
        </div>
        <input
          className="field-input"
          style={{ top: 38 }}
          placeholder="ex: 192.168.0.10"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        />

        <div className="field-label" style={{ top: 100 }}>
          Porta
        </div>
        <input
          className="field-input"
          style={{ top: 120 }}
          type="tel"
          inputMode="numeric"
          placeholder="9000"
          value={port}
          onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      {status && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 320,
            width: 350,
            textAlign: 'center',
            fontSize: 11,
            color: status.ok ? '#2d5e3a' : '#c0392b',
          }}
        >
          {status.msg}
        </div>
      )}

      <button className="green-button" style={{ top: 360 }} onClick={testar} disabled={testando}>
        {testando ? 'Testando...' : 'Testar e Salvar'}
      </button>
    </div>
  );
}
