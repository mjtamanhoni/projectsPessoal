import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getServerList,
  setServerList,
  testServer,
  type ServerEndpoint,
} from '../api';
import BackButton from '../components/BackButton';

export default function ServerConfig() {
  const navigate = useNavigate();
  const [servers, setServers] = useState<ServerEndpoint[]>(() => getServerList());
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testando, setTestando] = useState(false);

  const atualizar = (i: number, campo: 'host' | 'port', valor: string) => {
    setServers((prev) =>
      prev.map((s, idx) =>
        idx === i ? { ...s, [campo]: campo === 'port' ? valor.replace(/\D/g, '') : valor } : s
      )
    );
  };

  const adicionar = () => setServers((prev) => [...prev, { host: '', port: 9000 }]);
  const remover = (i: number) => setServers((prev) => prev.filter((_, idx) => idx !== i));

  const testar = async () => {
    setStatus(null);
    const validos = servers
      .map((s) => ({ host: s.host.trim(), port: Number(s.port) || 9000 }))
      .filter((s) => s.host);
    if (validos.length === 0) {
      setStatus({ ok: false, msg: 'Informe pelo menos um servidor' });
      return;
    }
    setTestando(true);
    const resultados: string[] = [];
    for (const s of validos) {
      try {
        await testServer(s.host, s.port);
        resultados.push(`✓ ${s.host}:${s.port}`);
      } catch {
        resultados.push(`✗ ${s.host}:${s.port}`);
      }
    }
    setServerList(validos);
    const ok = resultados.filter((r) => r.startsWith('✓')).length;
    setStatus({
      ok: ok > 0,
      msg: `${resultados.join('  ')}  (${ok}/${resultados.length} acessíveis)`,
    });
    setTestando(false);
  };

  const altura = 120 + servers.length * 90;

  return (
    <div className="screen">
      <div className="screen-topbar" />
      <BackButton onClick={() => navigate(-1)} />
      <div className="dashboard-title" style={{ left: 42, top: 26 }}>
        Servidor do App
      </div>
      <div className="dashboard-subtitle" style={{ left: 42, top: 58 }}>
        Lista com fallback automático
      </div>

      <div className="auth-card" style={{ top: 90, height: altura, overflow: 'hidden', left: 20, right: 20 }}>
        {servers.map((s, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <div className="field-label" style={{ top: 18 + i * 90, width: 210 }}>
              Servidor {i + 1}{' '}
              {i === 0 && <span style={{ fontSize: 10, color: '#888' }}>(principal)</span>}
            </div>
            <input
              className="field-input"
              style={{ top: 38 + i * 90, left: 20, width: 'calc(100% - 40px)' }}
              placeholder="ex: 192.168.0.10 ou meuservidor.com"
              value={s.host}
              onChange={(e) => atualizar(i, 'host', e.target.value)}
            />
            <input
              className="field-input"
              style={{ top: 72 + i * 90, left: 20, width: 'calc(100% - 40px)' }}
              type="tel"
              inputMode="numeric"
              placeholder="Porta (padrão: 9000)"
              value={String(s.port)}
              onChange={(e) => atualizar(i, 'port', e.target.value)}
            />
            <button
              onClick={() => remover(i)}
              disabled={servers.length <= 1}
              style={{
                position: 'absolute',
                top: 42 + i * 90,
                right: 4,
                border: 'none',
                background: 'transparent',
                color: servers.length <= 1 ? '#bbb' : '#FF3B30',
                fontSize: 18,
                cursor: servers.length <= 1 ? 'default' : 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={adicionar}
          style={{
            position: 'absolute',
            left: 20,
            top: 40 + servers.length * 90,
            border: 'none',
            background: 'transparent',
            color: '#2563eb',
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          + Adicionar servidor
        </button>
      </div>

      {status && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 240 + servers.length * 90,
            width: 'calc(100% - 40px)',
            textAlign: 'center',
            fontSize: 11,
            color: status.ok ? '#34C759' : '#FF3B30',
          }}
        >
          {status.msg}
        </div>
      )}

      <button className="green-button" style={{ top: 280 + servers.length * 90 }} onClick={testar} disabled={testando}>
        {testando ? 'Testando...' : 'Testar e Salvar'}
      </button>
    </div>
  );
}
