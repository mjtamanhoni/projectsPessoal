import { useCallback, useEffect, useRef, useState } from 'react';
import {
  comprovanteParaTexto,
  consultarSolicitacao,
  enviarComprovante,
  extrairErro,
  obterIntegracao,
  obterPixCobranca,
  obterSolicitacaoLocal,
  prepararComprovante,
  salvarIntegracao,
  solicitarDesbloqueio,
  type Comprovante,
  type Integracao,
  type ResultadoSolicitacao,
  type SolicitacaoLocal,
} from '../data';
import { formatCurrency, formatDate } from '../format';
import { useLicense } from '../security/LicenseProvider';
import { CheckIcon, CopyIcon, ServerIcon, TrashIcon, WalletIcon } from './Icons';

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function Desbloqueio() {
  const { status: licenca, recarregar: recarregarLicenca } = useLicense();

  const [integracao, setIntegracao] = useState<Integracao>({ url: '', porta: 3001 });
  const [carregando, setCarregando] = useState(true);
  const [salvandoConexao, setSalvandoConexao] = useState(false);
  const [situacao, setSituacao] = useState<SolicitacaoLocal>({ status: 'nenhuma' });
  const [resultado, setResultado] = useState<ResultadoSolicitacao | null>(null);
  const [pix, setPix] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [comprovante, setComprovante] = useState<Comprovante | null>(null);
  const [previa, setPrevia] = useState('');
  const [solicitando, setSolicitando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; msg: string } | null>(null);
  const [copiado, setCopiado] = useState<'pix' | 'chave' | null>(null);
  const inputComprovante = useRef<HTMLInputElement>(null);
  const consultandoRef = useRef(false);

  const notificar = useCallback((tone: 'ok' | 'error', msg: string) => {
    setFeedback({ tone, msg });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const aplicarResultado = useCallback(
    async (r: ResultadoSolicitacao) => {
      setResultado(r);
      setSituacao(await obterSolicitacaoLocal());
      await recarregarLicenca();
    },
    [recarregarLicenca]
  );

  const consultar = useCallback(
    async (silencioso: boolean) => {
      if (consultandoRef.current) return;
      consultandoRef.current = true;
      if (!silencioso) setVerificando(true);
      try {
        const r = await consultarSolicitacao();
        await aplicarResultado(r);
        if (!silencioso) {
          notificar(
            r.situacao === 'revogada' ? 'error' : 'ok',
            r.situacao === 'entregue'
              ? 'Licença liberada e ativada neste aparelho.'
              : r.situacao === 'revogada'
                ? 'A solicitação foi revogada pelo suporte.'
                : r.pix_chave
                  ? 'Dados atualizados.'
                  : 'Ainda não há chave PIX. Tente novamente mais tarde.'
          );
        } else if (r.situacao === 'entregue') {
          notificar('ok', 'Licença liberada e ativada neste aparelho.');
        }
      } catch (e) {
        if (!silencioso) notificar('error', extrairErro(e));
      } finally {
        consultandoRef.current = false;
        if (!silencioso) setVerificando(false);
      }
    },
    [aplicarResultado, notificar]
  );

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [dados, local] = await Promise.all([
          obterIntegracao(),
          obterSolicitacaoLocal(),
        ]);
        if (!ativo) return;
        setIntegracao(dados);
        setSituacao(local);
        setMensagem(local.mensagem ?? '');
        setCarregando(false);

        if (local.status !== 'nenhuma') {
          await consultar(true);
        }
      } catch (e) {
        if (ativo) notificar('error', extrairErro(e));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [consultar, notificar, recarregarLicenca]);

  useEffect(() => {
    if (carregando || !integracao.url || situacao.status !== 'pendente') return;
    const timer = window.setInterval(() => {
      void consultar(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [carregando, integracao.url, situacao.status, consultar]);

  useEffect(() => {
    let ativo = true;
    const chave = resultado?.pix_chave ?? '';
    if (!chave) {
      setPix('');
      return () => {
        ativo = false;
      };
    }
    void obterPixCobranca(chave, resultado?.valor_centavos)
      .then((codigo) => {
        if (ativo) setPix(codigo);
      })
      .catch(() => {
        if (ativo) setPix('');
      });
    return () => {
      ativo = false;
    };
  }, [resultado?.pix_chave, resultado?.valor_centavos]);

  const salvarConexao = async () => {
    setSalvandoConexao(true);
    try {
      const salvo = await salvarIntegracao(integracao);
      setIntegracao(salvo);
      notificar('ok', 'Dados de conexão salvos.');
    } catch (e) {
      notificar('error', extrairErro(e));
    } finally {
      setSalvandoConexao(false);
    }
  };

  const copiar = async (tipo: 'pix' | 'chave', texto: string) => {
    const ok = await copiarTexto(texto);
    if (!ok) {
      notificar('error', 'Não foi possível copiar.');
      return;
    }
    setCopiado(tipo);
    window.setTimeout(() => setCopiado(null), 2000);
  };

  const solicitar = async () => {
    setSolicitando(true);
    try {
      const r = await solicitarDesbloqueio();
      await aplicarResultado(r);
      notificar('ok', 'Solicitação enviada. Aguarde a chave PIX do suporte.');
    } catch (e) {
      notificar('error', extrairErro(e));
    } finally {
      setSolicitando(false);
    }
  };

  const escolherComprovante = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      const preparado = await prepararComprovante(arquivo);
      setComprovante(preparado);
      setPrevia(comprovanteParaTexto(preparado));
      notificar('ok', 'Comprovante anexado.');
    } catch (e) {
      notificar('error', extrairErro(e));
    } finally {
      if (inputComprovante.current) inputComprovante.current.value = '';
    }
  };

  const removerComprovante = () => {
    setComprovante(null);
    setPrevia('');
  };

  const enviar = async () => {
    if (!comprovante) {
      notificar('error', 'Anexe o comprovante de pagamento.');
      return;
    }
    setEnviando(true);
    try {
      const r = await enviarComprovante(comprovante, mensagem.trim() || undefined);
      await aplicarResultado(r);
      setComprovante(null);
      setPrevia('');
      notificar(
        'ok',
        r.situacao === 'entregue'
          ? 'Licença ativada neste aparelho.'
          : 'Comprovante enviado. Aguardando liberação.'
      );
    } catch (e) {
      notificar('error', extrairErro(e));
    } finally {
      setEnviando(false);
    }
  };

  const licencaAtiva = licenca?.plano === 'full';
  const pixChave = resultado?.pix_chave ?? '';
  const valorCentavos = resultado?.valor_centavos ?? 0;
  const hasComprovante = Boolean(resultado?.has_comprovante);
  const temSolicitacao = situacao.status !== 'nenhuma';
  const rotuloSituacao = licencaAtiva
    ? 'Licença ativa'
    : situacao.status === 'entregue'
      ? 'Licença entregue'
      : situacao.status === 'revogada'
        ? 'Solicitação revogada'
        : !pixChave
          ? 'Aguardando chave PIX do suporte'
          : !hasComprovante
            ? 'Aguardando envio do comprovante'
            : 'Comprovante enviado — aguardando liberação';

  return (
    <section className="settings-card">
      <div className="section-heading">
        <span className="section-icon">
          <WalletIcon size={20} />
        </span>
        <div>
          <h3>Desbloqueio</h3>
          <p>Como funciona a liberação da licença completa.</p>
        </div>
      </div>

      {feedback && <div className={`feedback ${feedback.tone}`}>{feedback.msg}</div>}

      {licencaAtiva ? (
        <div className="license-badge ok">
          <CheckIcon size={16} />
          <span>Licença completa ativa{licenca?.cliente ? ` • ${licenca.cliente}` : ''}</span>
        </div>
      ) : null}

      {carregando ? (
        <div className="loading-state compact">
          <div className="spinner" />
          <span>Carregando...</span>
        </div>
      ) : (
        <>
          <ol className="passos-desbloqueio">
            <li>
              <strong>Solicite o desbloqueio:</strong> o código deste aparelho é enviado ao
              suporte.
            </li>
            <li>
              <strong>Receba a chave PIX:</strong> o suporte envia a chave aqui. Se demorar, toque
              em Atualizar.
            </li>
            <li>
              <strong>Pague e envie o comprovante:</strong> anexe a foto ou o PDF do pagamento.
            </li>
            <li>
              <strong>Aguarde a liberação:</strong> após a conferência do comprovante, o token é
              ativado automaticamente.
            </li>
          </ol>

          {licenca?.codigoDispositivo && (
            <p className="settings-hint">
              Aparelho: <strong>{licenca.codigoDispositivo}</strong>
            </p>
          )}

          <div className="section-subhead">
            <ServerIcon size={16} />
            <span>Conexão com o Gestor</span>
          </div>

          <label className="field">
            <span>URL de acesso ao FrontEnd</span>
            <input
              className="input"
              placeholder="exemplo.duckdns.org"
              value={integracao.url}
              onChange={(event) =>
                setIntegracao((atual) => ({ ...atual, url: event.target.value }))
              }
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span>Porta do FrontEnd</span>
            <input
              className="input"
              inputMode="numeric"
              value={String(integracao.porta)}
              onChange={(event) =>
                setIntegracao((atual) => ({
                  ...atual,
                  porta: Number(event.target.value.replace(/\D/g, '').slice(0, 5)) || 0,
                }))
              }
            />
          </label>

          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => void salvarConexao()}
            disabled={salvandoConexao}
          >
            {salvandoConexao ? 'Salvando...' : 'Salvar conexão'}
          </button>

          <div className="section-subhead">
            <WalletIcon size={16} />
            <span>Desbloqueio da licença</span>
          </div>

          {!temSolicitacao ? (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => void solicitar()}
              disabled={solicitando || !integracao.url}
            >
              {solicitando ? 'Enviando...' : 'Solicitar desbloqueio'}
            </button>
          ) : (
            <>
              <div className="solicitacao-status">
                <div>
                  <small>Situação da solicitação</small>
                  <strong>{rotuloSituacao}</strong>
                  {situacao.enviado_em && (
                    <span>Atualizada em {formatDate(situacao.enviado_em)}</span>
                  )}
                  {situacao.comprovante_nome && (
                    <span>Comprovante: {situacao.comprovante_nome}</span>
                  )}
                </div>
                {!licencaAtiva && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void consultar(false)}
                    disabled={verificando}
                  >
                    {verificando ? 'Atualizando...' : 'Atualizar'}
                  </button>
                )}
              </div>

              {situacao.status === 'revogada' && (
                <p className="settings-hint">
                  A solicitação anterior foi revogada. Se necessário, pague novamente e envie um
                  novo comprovante para reabrir o atendimento.
                </p>
              )}

              {pixChave ? (
                <div className="pix-box">
                  <div>
                    <small>Valor</small>
                    <strong>
                      {valorCentavos > 0
                        ? formatCurrency(valorCentavos / 100)
                        : 'a combinar com o suporte'}
                    </strong>
                  </div>
                  <div>
                    <small>Chave PIX</small>
                    <strong>{pixChave}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-block"
                    onClick={() => void copiar('chave', pixChave)}
                  >
                    {copiado === 'chave' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                    {copiado === 'chave' ? 'Chave copiada' : 'Copiar chave PIX'}
                  </button>
                  {pix && (
                    <>
                      <p className="settings-hint">
                        Pague pelo aplicativo do banco e use o código abaixo como PIX copia e cola.
                      </p>
                      <textarea
                        className="input license-token-input"
                        rows={4}
                        readOnly
                        value={pix}
                        onClick={(event) => (event.target as HTMLTextAreaElement).select()}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-block"
                        onClick={() => void copiar('pix', pix)}
                      >
                        {copiado === 'pix' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                        {copiado === 'pix' ? 'Código copiado' : 'Copiar código PIX'}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <p className="settings-hint">
                  Aguardando o suporte enviar a chave PIX. Toque em Atualizar para verificar.
                </p>
              )}

              {pixChave && !licencaAtiva && situacao.status !== 'entregue' && (
                <>
                  <div className="section-subhead">
                    <CheckIcon size={16} />
                    <span>{hasComprovante ? 'Reenviar comprovante' : 'Enviar comprovante'}</span>
                  </div>

                  {hasComprovante && (
                    <p className="settings-hint">
                      O comprovante já foi recebido pelo suporte. Se precisar corrigir, anexe um
                      novo.
                    </p>
                  )}

                  <div className="comprovante-box">
                    <input
                      ref={inputComprovante}
                      type="file"
                      accept="image/*,application/pdf"
                      hidden
                      onChange={(event) => void escolherComprovante(event.target.files?.[0])}
                    />
                    {comprovante ? (
                      <div className="comprovante-preview">
                        {previa ? (
                          <img src={previa} alt="Comprovante anexado" />
                        ) : (
                          <div className="comprovante-pdf">PDF anexado</div>
                        )}
                        <div className="comprovante-info">
                          <strong>{comprovante.nome}</strong>
                          <span>{comprovante.tipo}</span>
                          <div className="form-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => inputComprovante.current?.click()}
                            >
                              Trocar
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={removerComprovante}
                            >
                              <TrashIcon size={15} /> Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-block"
                        onClick={() => inputComprovante.current?.click()}
                      >
                        Anexar comprovante (imagem ou PDF)
                      </button>
                    )}
                  </div>

                  <label className="field">
                    <span>Mensagem para o suporte (opcional)</span>
                    <textarea
                      className="input"
                      rows={3}
                      value={mensagem}
                      onChange={(event) => setMensagem(event.target.value)}
                      placeholder="Alguma observação sobre o pagamento..."
                    />
                  </label>

                  <div className="settings-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      onClick={() => void enviar()}
                      disabled={enviando || !comprovante}
                    >
                      {enviando
                        ? 'Enviando...'
                        : hasComprovante
                          ? 'Reenviar comprovante'
                          : 'Enviar comprovante'}
                    </button>
                  </div>
                </>
              )}

              {situacao.status === 'entregue' && !licencaAtiva && (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => void consultar(false)}
                  disabled={verificando}
                >
                  {verificando ? 'Verificando...' : 'Verificar licença novamente'}
                </button>
              )}
            </>
          )}

          <p className="settings-hint">
            O token fica vinculado a este aparelho. Se os dados do app forem apagados por
            completo, será necessário solicitar um novo token.
          </p>
        </>
      )}
    </section>
  );
}
