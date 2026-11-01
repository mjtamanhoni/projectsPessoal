import { useState } from 'react';
import {
  getServerList,
  getServidorAtivo,
  sameServer,
  SERVIDOR_PADRAO,
  setServerList,
  setServidorAtivo,
  testServer,
  type ServerEndpoint,
} from '../api';
import { PlusIcon, ServerIcon, TrashIcon } from './Icons';

interface Props {
  onSaved?: () => void;
  allowMultiple?: boolean;
}

export function ServerConfigForm({ onSaved, allowMultiple = false }: Props) {
  const [servers, setServers] = useState<ServerEndpoint[]>(() => getServerList());
  const [ativoIndex, setAtivoIndex] = useState(() => {
    const ativo = getServidorAtivo();
    const indice = getServerList().findIndex((server) => sameServer(server, ativo));
    return indice >= 0 ? indice : 0;
  });
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

  const adicionar = () => {
    if (!allowMultiple) return;
    setServers((prev) => [...prev, { host: '', port: SERVIDOR_PADRAO.port }]);
  };

  const remover = (index: number) => {
    setServers((prev) => prev.filter((_, i) => i !== index));
    setAtivoIndex((prev) => {
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  };

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

    let ativoValido = 0;
    let contador = 0;
    for (let i = 0; i < servers.length; i++) {
      if (!servers[i].host.trim()) continue;
      if (i === ativoIndex) {
        ativoValido = contador;
        break;
      }
      contador++;
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
    setServidorAtivo(validos[ativoValido] ?? validos[0]);
    const acessiveis = resultados.filter((r) => r.startsWith('OK')).length;
    setStatus({
      ok: acessiveis > 0,
      msg: `${resultados.join('  •  ')} (${acessiveis}/${resultados.length} acessíveis)`,
    });
    setTestando(false);
    if (acessiveis > 0) onSaved?.();
  };

  const multiplos = servers.length > 1;

  return (
    <div className="server-config">
      <div className="section-heading">
        <span className="section-icon">
          <ServerIcon size={20} />
        </span>
        <div>
          <h3>Servidor</h3>
          <p>
            {multiplos
              ? 'Escolha qual servidor o app deve acessar.'
              : 'Endereço usado pelo app.'}
          </p>
        </div>
      </div>

      <div className="server-list">
        {servers.map((server, index) => (
          <div
            className={`server-row${multiplos && index === ativoIndex ? ' active' : ''}`}
            key={index}
          >
            <div className="server-row-head">
              <span>
                Servidor {index + 1}
                {multiplos && index === ativoIndex ? ' (em uso)' : ''}
              </span>
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

            {multiplos && (
              <label className="server-active">
                <input
                  type="radio"
                  name="servidor-ativo"
                  checked={index === ativoIndex}
                  onChange={() => setAtivoIndex(index)}
                />
                <span>Usar este servidor</span>
              </label>
            )}

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

      {allowMultiple ? (
        <button type="button" className="btn btn-ghost btn-block" onClick={adicionar}>
          <PlusIcon size={18} /> Adicionar servidor
        </button>
      ) : (
        <p className="server-hint">
          Apenas usuários superadmin podem cadastrar mais de um servidor.
        </p>
      )}

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
