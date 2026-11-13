import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  VERSAO_APP,
  exportarBackup,
  extrairErro,
  importarBackupTexto,
  lerArquivoTexto,
  limparDados,
  removerPin,
  resumoBackup,
  salvarConfig,
} from '../data';
import { definirPin } from '../data';
import { useConfig } from '../security/ConfigProvider';
import { useLicense } from '../security/LicenseProvider';
import { useLock } from '../security/LockProvider';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';
import { formatDate, mascaraCpfCnpj } from '../format';
import {
  BuildingIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  ReceiptIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon,
  WalletIcon,
} from '../components/Icons';

type Feedback = { tone: 'ok' | 'error'; msg: string } | null;

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

export function Configuracoes() {
  const navigate = useNavigate();
  const { config, recarregar } = useConfig();
  const {
    temPin,
    biometriaDisponivel,
    biometriaAtiva,
    bloquear,
    atualizarEstado,
  } = useLock();
  const {
    status: licenca,
    carregando: licencaCarregando,
    erro: erroLicenca,
    ativar: ativarLicenca,
    remover: removerLicenca,
    recarregar: recarregarLicenca,
  } = useLicense();

  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [pinAberto, setPinAberto] = useState(false);
  const [novoPin, setNovoPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [mostrarPin, setMostrarPin] = useState(false);
  const [erroPin, setErroPin] = useState('');
  const [salvandoPin, setSalvandoPin] = useState(false);

  const [backupOcupado, setBackupOcupado] = useState(false);
  const [importacao, setImportacao] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [apagarAberto, setApagarAberto] = useState(false);
  const [apagando, setApagando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [licencaAberta, setLicencaAberta] = useState(false);
  const [tokenLicenca, setTokenLicenca] = useState('');
  const [erroAtivacao, setErroAtivacao] = useState('');
  const [ativando, setAtivando] = useState(false);
  const [licencaRemoverAberto, setLicencaRemoverAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!config) return;
    setNome(config.nome);
    setEmpresa(config.empresa);
    setCnpj(config.cnpj);
    setChavePix(config.chave_pix);
  }, [config]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    void recarregarLicenca();
  }, [recarregarLicenca]);

  const inicial = (config?.nome || 'T').trim().charAt(0).toUpperCase();

  const salvarPerfil = async () => {
    setSalvandoPerfil(true);
    try {
      await salvarConfig({ nome, empresa, cnpj, chave_pix: chavePix });
      await recarregar();
      setFeedback({ tone: 'ok', msg: 'Dados salvos.' });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const salvarPin = async () => {
    setErroPin('');
    if (novoPin.length < 4) {
      setErroPin('O PIN deve ter pelo menos 4 dígitos.');
      return;
    }
    if (novoPin !== confirmarPin) {
      setErroPin('Os PINs não conferem.');
      return;
    }
    setSalvandoPin(true);
    try {
      await definirPin(novoPin);
      await atualizarEstado();
      await recarregar();
      setPinAberto(false);
      setNovoPin('');
      setConfirmarPin('');
      setFeedback({ tone: 'ok', msg: 'PIN atualizado.' });
    } catch (e) {
      setErroPin(extrairErro(e));
    } finally {
      setSalvandoPin(false);
    }
  };

  const alternarBiometria = async () => {
    try {
      await salvarConfig({ biometria: !biometriaAtiva });
      await atualizarEstado();
      await recarregar();
      setFeedback({
        tone: 'ok',
        msg: biometriaAtiva ? 'Biometria desativada.' : 'Biometria ativada.',
      });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    }
  };

  const exportar = async () => {
    setBackupOcupado(true);
    try {
      const { nome: arquivo } = await exportarBackup();
      setFeedback({ tone: 'ok', msg: `Backup gerado: ${arquivo}` });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setBackupOcupado(false);
    }
  };

  const escolherArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    try {
      const texto = await lerArquivoTexto(arquivo);
      setImportacao(texto);
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      if (inputArquivo.current) inputArquivo.current.value = '';
    }
  };

  const confirmarImportacao = async () => {
    if (!importacao) return;
    setImportando(true);
    try {
      const resultado = await importarBackupTexto(importacao);
      await recarregar();
      await recarregarLicenca();
      setImportacao(null);
      setFeedback({ tone: 'ok', msg: resumoBackup(resultado) });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setImportando(false);
    }
  };

  const apagarTudo = async () => {
    setApagando(true);
    try {
      await limparDados();
      await removerPin();
      await atualizarEstado();
      await recarregar();
      await recarregarLicenca();
      setApagarAberto(false);
      setFeedback({ tone: 'ok', msg: 'Todos os dados foram apagados.' });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setApagando(false);
    }
  };

  const copiarCodigoDispositivo = async () => {
    if (!licenca) return;
    const ok = await copiarTexto(licenca.codigoDispositivo);
    setCopiado(ok);
    if (ok) window.setTimeout(() => setCopiado(false), 2000);
  };

  const confirmarAtivacao = async () => {
    setErroAtivacao('');
    if (!tokenLicenca.trim()) {
      setErroAtivacao('Cole o token de licença.');
      return;
    }
    setAtivando(true);
    try {
      const status = await ativarLicenca(tokenLicenca);
      setTokenLicenca('');
      setLicencaAberta(false);
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

  const confirmarRemocaoLicenca = async () => {
    try {
      await removerLicenca();
      setLicencaRemoverAberto(false);
      setLicencaAberta(false);
      setFeedback({ tone: 'ok', msg: 'Licença removida. O app voltou à demonstração.' });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    }
  };

  const abrirLicenca = () => {
    setErroAtivacao('');
    setTokenLicenca('');
    setLicencaAberta(true);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark small">
            <SettingsIcon size={24} />
          </span>
          <div>
            <h1>Configurações</h1>
            <p>Perfil, segurança e backup</p>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="account-card">
          <div className="avatar">{inicial}</div>
          <div className="account-info">
            <h2>{config?.nome || 'Meu aplicativo'}</h2>
            <p>{config?.empresa || 'Contas pessoais'}</p>
            {config?.cnpj && (
              <span className="account-company">
                <BuildingIcon size={14} />
                {config.cnpj}
              </span>
            )}
          </div>
        </section>

        {feedback && <div className={`feedback ${feedback.tone}`}>{feedback.msg}</div>}

        <section className="settings-card">
          <div className="section-heading">
            <span className="section-icon">
              <UserIcon size={20} />
            </span>
            <div>
              <h3>Meus dados</h3>
              <p>Aparecem no cabeçalho e nos relatórios.</p>
            </div>
          </div>

          <label className="field">
            <span>Seu nome</span>
            <input
              className="input"
              placeholder="Ex: Maria Silva"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Nome do negócio (opcional)</span>
            <input
              className="input"
              placeholder="Ex: Mercado Bom Preço"
              value={empresa}
              onChange={(event) => setEmpresa(event.target.value)}
            />
          </label>

          <label className="field">
            <span>CNPJ/CPF (opcional)</span>
            <input
              className="input"
              placeholder="000.000.000-00"
              value={cnpj}
              onChange={(event) => setCnpj(mascaraCpfCnpj(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Chave PIX padrão</span>
            <input
              className="input"
              placeholder="Opcional"
              value={chavePix}
              onChange={(event) => setChavePix(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => void salvarPerfil()}
              disabled={salvandoPerfil}
            >
              {salvandoPerfil ? 'Salvando...' : 'Salvar dados'}
            </button>
          </div>
        </section>

        <section className="settings-card">
          <div className="section-heading">
            <span className="section-icon">
              <CheckIcon size={20} />
            </span>
            <div>
              <h3>Segurança</h3>
              <p>{temPin ? 'PIN ativo neste aparelho.' : 'Sem PIN: o app abre direto.'}</p>
            </div>
          </div>

          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                setNovoPin('');
                setConfirmarPin('');
                setErroPin('');
                setPinAberto(true);
              }}
            >
              {temPin ? 'Alterar PIN' : 'Criar PIN'}
            </button>

            {temPin && biometriaDisponivel && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => void alternarBiometria()}
              >
                {biometriaAtiva ? 'Desativar biometria' : 'Ativar biometria'}
              </button>
            )}

            {temPin && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => {
                  bloquear();
                  navigate('/lock', { replace: true });
                }}
              >
                Bloquear agora
              </button>
            )}
          </div>

          {temPin && !biometriaDisponivel && (
            <p className="settings-hint">
              A biometria não está disponível neste aparelho.
            </p>
          )}
        </section>

        <section className="settings-card">
          <div className="section-heading">
            <span className="section-icon">
              <CheckIcon size={20} />
            </span>
            <div>
              <h3>Licença</h3>
              <p>
                {licenca?.licencaAtiva && licenca.plano === 'full'
                  ? 'Licença ativa: cadastros ilimitados.'
                  : licencaCarregando
                    ? 'Verificando licença...'
                    : 'Modo demonstração com limites de cadastro.'}
              </p>
            </div>
          </div>

          {erroLicenca && <p className="form-error">{erroLicenca}</p>}

          {licenca && (
            <>
              <div className="license-device">
                <div>
                  <small>Código do aparelho</small>
                  <strong>{licenca.codigoDispositivo}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void copiarCodigoDispositivo()}
                >
                  {copiado ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="settings-hint">
                Informe este código ao suporte para gerar a licença deste aparelho.
              </p>

              {licenca.plano === 'full' ? (
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

              {licenca.plano === 'full' && (
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

              <div className="settings-actions">
                {licenca.plano === 'full' ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-block"
                      onClick={abrirLicenca}
                    >
                      Substituir licença
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-block"
                      onClick={() => setLicencaRemoverAberto(true)}
                    >
                      Remover licença
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={abrirLicenca}
                  >
                    Ativar licença
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <section className="settings-card">
          <div className="section-heading">
            <span className="section-icon">
              <WalletIcon size={20} />
            </span>
            <div>
              <h3>Backup</h3>
              <p>Seus dados ficam só neste aparelho. Exporte uma cópia de vez em quando.</p>
            </div>
          </div>

          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => void exportar()}
              disabled={backupOcupado}
            >
              {backupOcupado ? 'Gerando backup...' : 'Exportar backup'}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => inputArquivo.current?.click()}
              disabled={backupOcupado}
            >
              Importar backup
            </button>

            <input
              ref={inputArquivo}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => void escolherArquivo(event.target.files?.[0])}
            />
          </div>

          <p className="settings-hint">
            O arquivo gerado pode ser salvo no Google Drive, enviado por e-mail ou guardado em
            outro lugar. Ao importar, os dados atuais são substituídos.
          </p>
        </section>

        <section className="settings-card about-card">
          <div className="section-heading">
            <span className="section-icon">
              <ReceiptIcon size={20} />
            </span>
            <div>
              <h3>Sobre o app</h3>
              <p>Títulos a Pagar · versão {VERSAO_APP}</p>
            </div>
          </div>
          <p className="about-text">
            Acompanhe os títulos em aberto, registre pagamentos parciais e mantenha o saldo
            devedor sempre atualizado. Funciona sem internet.
          </p>
        </section>

        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => setApagarAberto(true)}
        >
          <TrashIcon size={18} /> Apagar todos os dados
        </button>

        <div className="settings-footer">
          <UserIcon size={15} />
          <span>Dados armazenados localmente, sem sincronização.</span>
        </div>
      </main>

      <BottomNav />

      {pinAberto && (
        <Modal
          title={temPin ? 'Alterar PIN' : 'Criar PIN'}
          subtitle="De 4 a 8 dígitos"
          onClose={() => {
            if (!salvandoPin) setPinAberto(false);
          }}
        >
          <label className="field">
            <span>Novo PIN</span>
            <div className="input-with-action">
              <input
                className="input"
                type={mostrarPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={novoPin}
                onChange={(event) => {
                  setNovoPin(event.target.value.replace(/\D/g, '').slice(0, 8));
                  setErroPin('');
                }}
                autoFocus
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setMostrarPin((v) => !v)}
                aria-label={mostrarPin ? 'Ocultar PIN' : 'Mostrar PIN'}
              >
                {mostrarPin ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
              </button>
            </div>
          </label>

          <label className="field">
            <span>Confirme o PIN</span>
            <input
              className="input"
              type={mostrarPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmarPin}
              onChange={(event) => {
                setConfirmarPin(event.target.value.replace(/\D/g, '').slice(0, 8));
                setErroPin('');
              }}
            />
          </label>

          {erroPin && <p className="form-error">{erroPin}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPinAberto(false)}
              disabled={salvandoPin}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void salvarPin()}
              disabled={salvandoPin || novoPin.length < 4}
            >
              {salvandoPin ? 'Salvando...' : 'Salvar PIN'}
            </button>
          </div>
        </Modal>
      )}

      {importacao && (
        <Modal
          title="Restaurar backup"
          subtitle="Isso substitui os dados atuais"
          onClose={() => {
            if (!importando) setImportacao(null);
          }}
        >
          <p className="confirm-text">
            Os títulos e pagamentos atuais serão substituídos pelos dados do arquivo. Um
            backup de segurança do estado atual é guardado automaticamente no aparelho.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setImportacao(null)}
              disabled={importando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void confirmarImportacao()}
              disabled={importando}
            >
              {importando ? 'Restaurando...' : 'Restaurar'}
            </button>
          </div>
        </Modal>
      )}

      {licencaAberta && (
        <Modal
          title={licenca?.plano === 'full' ? 'Substituir licença' : 'Ativar licença'}
          subtitle="Cole o token gerado no Gestor"
          onClose={() => {
            if (!ativando) setLicencaAberta(false);
          }}
        >
          {licenca && (
            <div className="license-device">
              <div>
                <small>Código deste aparelho</small>
                <strong>{licenca.codigoDispositivo}</strong>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void copiarCodigoDispositivo()}
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
              value={tokenLicenca}
              onChange={(event) => {
                setTokenLicenca(event.target.value);
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
            O token é validado neste aparelho, sem internet. Depois de ativado, ele fica
            salvo e não é incluído no backup.
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setLicencaAberta(false)}
              disabled={ativando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void confirmarAtivacao()}
              disabled={ativando}
            >
              {ativando ? 'Ativando...' : 'Ativar'}
            </button>
          </div>
        </Modal>
      )}

      {licencaRemoverAberto && (
        <Modal
          title="Remover licença"
          subtitle="O app voltará ao modo demonstração"
          onClose={() => setLicencaRemoverAberto(false)}
        >
          <p className="confirm-text">
            A licença salva será removida deste aparelho. O token continua válido, mas o app
            volta aos limites da demonstração até ser ativado novamente.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setLicencaRemoverAberto(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void confirmarRemocaoLicenca()}
            >
              Remover
            </button>
          </div>
        </Modal>
      )}

      {apagarAberto && (
        <Modal
          title="Apagar todos os dados"
          subtitle="Ação irreversível"
          onClose={() => {
            if (!apagando) setApagarAberto(false);
          }}
        >
          <p className="confirm-text">
            Todos os títulos, pagamentos e o PIN serão apagados deste aparelho. Se você ainda
            não exportou um backup, os dados serão perdidos.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setApagarAberto(false)}
              disabled={apagando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void apagarTudo()}
              disabled={apagando}
            >
              {apagando ? 'Apagando...' : 'Apagar tudo'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
