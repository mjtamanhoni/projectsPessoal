import { useCallback, useEffect, useRef, useState } from 'react';
import {
  VALOR_LICENCA_CENTAVOS,
  comprovanteParaTexto,
  consultarSolicitacao,
  enviarSolicitacao,
  extrairErro,
  obterIntegracao,
  obterPixCobranca,
  obterSolicitacaoLocal,
  prepararComprovante,
  salvarIntegracao,
  type Comprovante,
  type Integracao,
  type SolicitacaoLocal,
} from '../data';
import { formatCurrency, formatDate, mascaraMoeda, moneyInput, parseMoney } from '../format';
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

  const [integracao, setIntegracao] = useState<Integracao>({
    url: '',
    porta: 3001,
    chave_pix: '',
  });
  const [carregando, setCarregando] = useState(true);
  const [salvandoConexao, setSalvandoConexao] = useState(false);
  const [pix, setPix] = useState('');
  const [situacao, setSituacao] = useState<SolicitacaoLocal>({ status: 'nenhuma' });
  const [mensagem, setMensagem] = useState('');
  const [valor, setValor] = useState(
    VALOR_LICENCA_CENTAVOS > 0 ? moneyInput(VALOR_LICENCA_CENTAVOS / 100) : ''
  );
  const [comprovante, setComprovante] = useState<Comprovante | null>(null);
  const [previa, setPrevia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; msg: string } | null>(null);
  const [copiado, setCopiado] = useState<'pix' | 'chave' | null>(null);
  const inputComprovante = useRef<HTMLInputElement>(null);

  const notificar = useCallback((tone: 'ok' | 'error', msg: string) => {
    setFeedback({ tone, msg });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const atualizarPix = useCallback(async () => {
    try {
      setPix(await obterPixCobranca(VALOR_LICENCA_CENTAVOS));
    } catch {
      setPix('');
    }
  }, []);

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
        setValor(
          local.valor_centavos && local.valor_centavos > 0
            ? moneyInput(local.valor_centavos / 100)
            : VALOR_LICENCA_CENTAVOS > 0
              ? moneyInput(VALOR_LICENCA_CENTAVOS / 100)
              : ''
        );
        await atualizarPix();
      } catch (e) {
        if (ativo) notificar('error', extrairErro(e));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [atualizarPix, notificar]);

  const salvarConexao = async () => {
    setSalvandoConexao(true);
    try {
      const salvo = await salvarIntegracao(integracao);
      setIntegracao(salvo);
      await atualizarPix();
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

  const valorCentavos = () => {
    const numero = parseMoney(valor);
    return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) : undefined;
  };

  const enviar = async () => {
    if (!integracao.url) {
      notificar('error', 'Informe a URL do servidor antes de enviar.');
      return;
    }
    if (!comprovante) {
      notificar('error', 'Anexe o comprovante de pagamento.');
      return;
    }
    setEnviando(true);
    try {
      const local = await enviarSolicitacao({
        comprovante,
        mensagem,
        valor_centavos: valorCentavos(),
      });
      setSituacao(local);
      await recarregarLicenca();
      notificar(
        'ok',
        local.status === 'entregue'
          ? 'Licença ativada neste aparelho.'
          : 'Solicitação enviada. Aguardando liberação.'
      );
    } catch (e) {
      notificar('error', extrairErro(e));
    } finally {
      setEnviando(false);
    }
  };

  const verificar = async () => {
    setVerificando(true);
    try {
      const resultado = await consultarSolicitacao();
      setSituacao(await obterSolicitacaoLocal());
      await recarregarLicenca();
      notificar(
        'ok',
        resultado.situacao === 'entregue'
          ? 'Licença liberada e ativada neste aparelho.'
          : resultado.situacao === 'revogada'
            ? 'A solicitação foi revogada pelo suporte.'
            : 'Ainda não há liberação. Tente novamente mais tarde.'
      );
    } catch (e) {
      notificar('error', extrairErro(e));
    } finally {
      setVerificando(false);
    }
  };

  const licencaAtiva = licenca?.plano === 'full';
  const pixVisivel = pix && integracao.chave_pix;
  const valorLicenca =
    VALOR_LICENCA_CENTAVOS > 0
      ? formatCurrency(VALOR_LICENCA_CENTAVOS / 100)
      : 'a combinar com o suporte';

  return (
    <section className="settings-card">
      <div className="section-heading">
        <span className="section-icon">
          <WalletIcon size={20} />
        </span>
        <div>
          <h3>Desbloqueio</h3>
          <p>Pague via PIX e envie o comprovante para liberar a licença.</p>
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
          <div className="section-subhead">
            <ServerIcon size={16} />
            <span>Servidor do Gestor</span>
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

          <label className="field">
            <span>Chave PIX para pagamento</span>
            <input
              className="input"
              placeholder="CNPJ, e-mail, telefone ou chave aleatória"
              value={integracao.chave_pix}
              onChange={(event) =>
                setIntegracao((atual) => ({ ...atual, chave_pix: event.target.value }))
              }
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
            <span>Pagamento da licença</span>
          </div>

          <div className="pix-box">
            <div>
              <small>Valor</small>
              <strong>{valorLicenca}</strong>
            </div>
            <div>
              <small>Chave PIX</small>
              <strong>{integracao.chave_pix || 'Não configurada'}</strong>
            </div>
            {integracao.chave_pix && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-block"
                onClick={() => void copiar('chave', integracao.chave_pix)}
              >
                {copiado === 'chave' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                {copiado === 'chave' ? 'Chave copiada' : 'Copiar chave PIX'}
              </button>
            )}
            {pixVisivel && (
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

          <div className="section-subhead">
            <CheckIcon size={16} />
            <span>Comprovante e solicitação</span>
          </div>

          {licenca?.codigoDispositivo && (
            <p className="settings-hint">
              Aparelho: <strong>{licenca.codigoDispositivo}</strong>
            </p>
          )}

          <label className="field">
            <span>Valor pago (opcional)</span>
            <input
              className="input"
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(event) => setValor(mascaraMoeda(event.target.value))}
            />
          </label>

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
              disabled={enviando || !comprovante || !integracao.url}
            >
              {enviando ? 'Enviando...' : 'Enviar solicitação de desbloqueio'}
            </button>
          </div>

          {situacao.status !== 'nenhuma' && (
            <div className="solicitacao-status">
              <div>
                <small>Situação da solicitação</small>
                <strong>
                  {situacao.status === 'pendente'
                    ? 'Aguardando liberação'
                    : situacao.status === 'entregue'
                      ? 'Licença entregue'
                      : 'Solicitação revogada'}
                </strong>
                {situacao.enviado_em && (
                  <span>Enviada em {formatDate(situacao.enviado_em)}</span>
                )}
                {situacao.comprovante_nome && <span>Comprovante: {situacao.comprovante_nome}</span>}
              </div>
              {situacao.status === 'pendente' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void verificar()}
                  disabled={verificando}
                >
                  {verificando ? 'Verificando...' : 'Verificar liberação'}
                </button>
              )}
            </div>
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
