import { useEffect, useState } from 'react';
import { extrairErro } from '../../data';
import { formatDate } from '../../format';
import { useLicense } from '../../security/LicenseProvider';
import { Desbloqueio } from '../../components/Desbloqueio';
import { Modal } from '../../components/Modal';
import { CheckIcon, CopyIcon, WalletIcon } from '../../components/Icons';
import { FeedbackBar, copiarTexto, useFeedback } from './comum';

export function LicencaTab({ onIrParaConexao }: { onIrParaConexao: () => void }) {
  const {
    status: licenca,
    carregando,
    erro,
    ativar,
    remover,
    recarregar,
  } = useLicense();
  const { feedback, setFeedback } = useFeedback();

  const [manualAberto, setManualAberto] = useState(false);
  const [token, setToken] = useState('');
  const [erroAtivacao, setErroAtivacao] = useState('');
  const [ativando, setAtivando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [removerAberto, setRemoverAberto] = useState(false);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const licencaAtiva = licenca?.plano === 'full';
  const mostrarFormulario = !licencaAtiva || manualAberto;

  const copiarCodigo = async () => {
    if (!licenca) return;
    const ok = await copiarTexto(licenca.codigoDispositivo);
    if (!ok) {
      setFeedback({ tone: 'error', msg: 'Não foi possível copiar.' });
      return;
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  };

  const confirmarAtivacao = async () => {
    setErroAtivacao('');
    if (!token.trim()) {
      setErroAtivacao('Cole o token de licença.');
      return;
    }
    setAtivando(true);
    try {
      const status = await ativar(token);
      setToken('');
      setManualAberto(false);
      setFeedback({
        tone: 'ok',
        msg:
          status.plano === 'full'
            ? 'Licença ativada. Cadastros ilimitados liberados.'
            : 'Licença ativada.',
      });
    } catch (e) {
      setErroAtivacao(extrairErro(e));
    } finally {
      setAtivando(false);
    }
  };

  const confirmarRemocao = async () => {
    try {
      await remover();
      setRemoverAberto(false);
      setManualAberto(false);
      setFeedback({ tone: 'ok', msg: 'Licença removida. O app voltou à demonstração.' });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    }
  };

  return (
    <>
      <section className="settings-card">
        <div className="section-heading">
          <span className="section-icon">
            <WalletIcon size={20} />
          </span>
          <div>
            <h3>Licença</h3>
            <p>
              {licencaAtiva
                ? 'Licença ativa: cadastros ilimitados.'
                : carregando
                  ? 'Verificando licença...'
                  : 'Modo demonstração com limites de cadastro.'}
            </p>
          </div>
        </div>

        <FeedbackBar feedback={feedback} />

        {erro && <p className="form-error">{erro}</p>}

        {carregando && !licenca ? (
          <div className="loading-state compact">
            <div className="spinner" />
            <span>Verificando...</span>
          </div>
        ) : licenca ? (
          <>
            {licencaAtiva ? (
              <div className="license-badge ok">
                <CheckIcon size={16} />
                <span>
                  Licença completa{licenca.cliente ? ` • ${licenca.cliente}` : ''}
                </span>
              </div>
            ) : (
              <div className="license-badge">
                <strong>Demonstração</strong>
                <span>
                  {licenca.totalTitulos}/{licenca.limiteTotal} títulos
                </span>
                <span>
                  {licenca.titulosNoMes}/{licenca.limiteMensal} novos neste mês
                </span>
              </div>
            )}

            {licenca.motivoInativo && (
              <p className="form-error">
                {licenca.motivoInativo === 'expirada'
                  ? `A licença salva venceu${licenca.expiraEm ? ` em ${formatDate(licenca.expiraEm)}` : ''}. O app está em demonstração.`
                  : licenca.motivoInativo === 'dispositivo'
                    ? 'A licença salva foi gerada para outro aparelho. Ative um token deste aparelho.'
                    : licenca.erroToken || 'A licença salva não pôde ser validada.'}
              </p>
            )}

            {licencaAtiva && (
              <p className="settings-hint">
                {licenca.expiraEm
                  ? `Válida até ${formatDate(licenca.expiraEm)}.`
                  : 'Licença permanente.'}
              </p>
            )}

            {licenca.planoToken && licenca.planoToken !== 'full' && (
              <p className="settings-hint">
                Plano informado no token: {licenca.planoToken}.
              </p>
            )}
          </>
        ) : null}
      </section>

      <Desbloqueio onIrParaConexao={onIrParaConexao} />

      <div className="config-divider">ou ative manualmente</div>

      <section className="settings-card">
        <div className="section-heading">
          <span className="section-icon">
            <CheckIcon size={20} />
          </span>
          <div>
            <h3>{licencaAtiva ? 'Substituir licença' : 'Ativar licença manualmente'}</h3>
            <p>Tem um token do suporte? Ative por aqui.</p>
          </div>
        </div>

        {!mostrarFormulario ? (
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => setManualAberto(true)}
            >
              Substituir licença
            </button>
            <button
              type="button"
              className="btn btn-danger btn-block"
              onClick={() => setRemoverAberto(true)}
            >
              Remover licença
            </button>
          </div>
        ) : (
          <>
            {licenca && (
              <div className="license-device">
                <div>
                  <small>Código do aparelho</small>
                  <strong>{licenca.codigoDispositivo}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void copiarCodigo()}
                >
                  {copiado ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}

            <label className="field">
              <span>Token de licença</span>
              <textarea
                className="input license-token-input"
                rows={6}
                value={token}
                onChange={(event) => {
                  setToken(event.target.value);
                  setErroAtivacao('');
                }}
                placeholder="Cole aqui o token recebido..."
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            {erroAtivacao && <p className="form-error">{erroAtivacao}</p>}

            <p className="settings-hint">
              O token é validado neste aparelho, sem internet. Depois de ativado, ele fica salvo
              e não é incluído no backup.
            </p>

            <div className="settings-actions">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => void confirmarAtivacao()}
                disabled={ativando}
              >
                {ativando ? 'Ativando...' : 'Ativar licença'}
              </button>
              {licencaAtiva && (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() => {
                    setManualAberto(false);
                    setToken('');
                    setErroAtivacao('');
                  }}
                  disabled={ativando}
                >
                  Cancelar
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {removerAberto && (
        <Modal
          title="Remover licença"
          subtitle="O app voltará ao modo demonstração"
          onClose={() => setRemoverAberto(false)}
        >
          <p className="confirm-text">
            A licença salva será removida deste aparelho. O token continua válido, mas o app volta
            aos limites da demonstração até ser ativado novamente.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRemoverAberto(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void confirmarRemocao()}
            >
              Remover
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
