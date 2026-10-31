import { useState } from 'react';
import {
  getServerList,
  SERVIDOR_PADRAO,
  setServerList,
  testServer,
  type ServerEndpoint,
} from '../api';
import { PlusIcon, ServerIcon, TrashIcon } from './Icons';

interface Props {
  onSaved?: () => void;
}

export function ServerConfigForm({ onSaved }: Props) {
  const [servers, setServers] = useState<ServerEndpoint[]>(() => getServerList());
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testando, setTestando] = useState(false);

  const atualizar = (index: number, campo: 'host' | 'port', valor: string) => {
    setServers((prev) =>
      prev.map((server, i) =>
        i === index
          ? { ...server, [campo]: campo === 'port' ? valor.replace(/\D/g, '') : valor }
          : server
      )
    );
  };

  const adicionar = () =>
    setServers((prev) => [...prev, { host: '', port: SERVIDOR_PADRAO.port }]);

  const remover = (index: number) =>
    setServers((prev) => prev.filter((_, i) => i !== index));

  const testarESalvar = async () => {
    setStatus(null);
    const validos = servers
      .map((server) => ({
        host: server.host.trim(),
        port: Number(server.port) || SERVIDOR_PADRAO.port,
      }))
      .filter((server) => server.host);

    if (validos.length === 0) {
      setStatus({ ok: false, msg: 'Informe pelo menos um servidor.' });
      return;
    }

    setTestando(true);
    const resultados: string[] = [];
    for (const server of validos) {
      try {
        await testServer(server.host, server.port);
        resultados.push(`OK ${server.host}:${server.port}`);
      } catch {
        resultados.push(`FALHA ${server.host}:${server.port}`);
      }
    }
    setServerList(validos);
    const acessiveis = resultados.filter((r) => r.startsWith('OK')).length;
    setStatus({
      ok: acessiveis > 0,
      msg: `${resultados.join('  •  ')} (${acessiveis}/${resultados.length} acessíveis)`,
    });
    setTestando(false);
    if (acessiveis > 0) onSaved?.();
  };

  return (
    <div className="server-config">
      <div className="section-heading">
        <span className="section-icon">
          <ServerIcon size={20} />
        </span>
        <div>
          <h3>Servidor</h3>
          <p>Endereços usados pelo app, com fallback automático.</p>
        </div>
      </div>

      <div className="server-list">
        {servers.map((server, index) => (
          <div className="server-row" key={index}>
            <div className="server-row-head">
              <span>Servidor {index + 1}{index === 0 ? ' (principal)' : ''}</span>
              <button
                type="button"
                className="icon-button danger"
                onClick={() => remover(index)}
                disabled={servers.length <= 1}
                aria-label="Remover servidor"
              >
                <TrashIcon size={17} />
              </button>
            </div>
            <label className="field">
              <span>Host</span>
              <input
                className="input"
                placeholder="ex: 192.168.0.10 ou meuservidor.com"
                value={server.host}
                onChange={(event) => atualizar(index, 'host', event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <label className="field">
              <span>Porta</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder={`Padrão: ${SERVIDOR_PADRAO.port}`}
                value={String(server.port)}
                onChange={(event) => atualizar(index, 'port', event.target.value)}
              />
            </label>
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-ghost btn-block" onClick={adicionar}>
        <PlusIcon size={18} /> Adicionar servidor
      </button>

      {status && (
        <p className={`server-status${status.ok ? ' ok' : ' error'}`}>{status.msg}</p>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={testarESalvar}
        disabled={testando}
      >
        {testando ? 'Testando...' : 'Testar e salvar'}
      </button>
    </div>
  );
}
