import { useEffect, useState } from 'react';
import {
  extrairErro,
  montarBaseUrl,
  obterIntegracao,
  salvarIntegracao,
  type Integracao,
} from '../../data';
import { ServerIcon } from '../../components/Icons';
import { FeedbackBar, useFeedback } from './comum';

export function ConexaoTab() {
  const { feedback, setFeedback } = useFeedback();
  const [integracao, setIntegracao] = useState<Integracao>({ url: '', porta: 3001 });
  const [https, setHttps] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState('');

  useEffect(() => {
    let ativo = true;
    obterIntegracao()
      .then((dados) => {
        if (!ativo) return;
        setIntegracao(dados);
        setHttps(dados.url.toLowerCase().startsWith('https://'));
      })
      .catch((e) => {
        if (ativo) setFeedback({ tone: 'error', msg: extrairErro(e) });
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const atualizarUrl = (valor: string) => {
    setIntegracao((atual) => ({ ...atual, url: valor }));
    if (/^https?:\/\//i.test(valor)) setHttps(/^https:/i.test(valor));
    setTeste('');
  };

  const alternarHttps = (ativo: boolean) => {
    setHttps(ativo);
    setTeste('');
    setIntegracao((atual) => {
      const host = atual.url.replace(/^https?:\/\//i, '');
      const trocarPorta = atual.porta === 3001 || atual.porta === 80 || atual.porta === 0;
      return {
        url: ativo && host ? `https://${host}` : host,
        porta: ativo && trocarPorta ? 443 : atual.porta,
      };
    });
  };

  const salvar = async () => {
    setSalvando(true);
    setTeste('');
    try {
      const salvo = await salvarIntegracao(integracao);
      setIntegracao(salvo);
      setHttps(salvo.url.toLowerCase().startsWith('https://'));
      setFeedback({ tone: 'ok', msg: 'Conexão salva.' });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setSalvando(false);
    }
  };

  const testar = async () => {
    const base = montarBaseUrl(integracao);
    if (!base) {
      setFeedback({ tone: 'error', msg: 'Informe a URL do servidor.' });
      return;
    }
    setTestando(true);
    setTeste('');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const resposta = await fetch(`${base}/health`, { signal: controller.signal });
      if (!resposta.ok) throw new Error(`O servidor respondeu ${resposta.status}.`);
      const dados = (await resposta.json().catch(() => null)) as { status?: string } | null;
      setTeste(base);
      setFeedback({
        tone: 'ok',
        msg: dados?.status ? `Conectado (${dados.status}).` : 'Conexão estabelecida.',
      });
    } catch (e) {
      setFeedback({
        tone: 'error',
        msg:
          e instanceof Error && e.name === 'AbortError'
            ? 'Tempo esgotado ao conectar. Verifique o endereço e a rede.'
            : `Não foi possível conectar: ${extrairErro(e)}`,
      });
    } finally {
      window.clearTimeout(timer);
      setTestando(false);
    }
  };

  return (
    <section className="settings-card">
      <div className="section-heading">
        <span className="section-icon">
          <ServerIcon size={20} />
        </span>
        <div>
          <h3>Conexão com o Gestor</h3>
          <p>Endereço usado para solicitar e confirmar a licença.</p>
        </div>
      </div>

      <FeedbackBar feedback={feedback} />

      {carregando ? (
        <div className="loading-state compact">
          <div className="spinner" />
          <span>Carregando...</span>
        </div>
      ) : (
        <>
          <label className="field">
            <span>URL de acesso</span>
            <input
              className="input"
              placeholder="gestor.mjtsystems.com.br"
              value={integracao.url}
              onChange={(event) => atualizarUrl(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span>Porta</span>
            <input
              className="input"
              inputMode="numeric"
              value={String(integracao.porta)}
              onChange={(event) => {
                setIntegracao((atual) => ({
                  ...atual,
                  porta: Number(event.target.value.replace(/\D/g, '').slice(0, 5)) || 0,
                }));
                setTeste('');
              }}
            />
          </label>

          <label className="config-switch">
            <input
              type="checkbox"
              checked={https}
              onChange={(event) => alternarHttps(event.target.checked)}
            />
            <span>Usar HTTPS</span>
          </label>

          <p className="settings-hint">
            Informe apenas o endereço do servidor. Com HTTPS, use a porta 443 e um domínio com
            certificado válido.
          </p>

          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => void testar()}
              disabled={testando || !integracao.url}
            >
              {testando ? 'Testando...' : 'Testar conexão'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => void salvar()}
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar conexão'}
            </button>
          </div>

          {teste && (
            <p className="settings-hint">
              Servidor: <strong>{teste}</strong>
            </p>
          )}

          {!integracao.url && (
            <p className="form-error">
              Sem endereço configurado, o desbloqueio automático não funciona.
            </p>
          )}
        </>
      )}
    </section>
  );
}
