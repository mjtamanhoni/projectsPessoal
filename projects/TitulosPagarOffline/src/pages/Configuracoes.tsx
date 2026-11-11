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
import { useLock } from '../security/LockProvider';
import { BottomNav } from '../components/BottomNav';
import { Modal } from '../components/Modal';
import { mascaraCpfCnpj } from '../format';
import {
  BuildingIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  ReceiptIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon,
  WalletIcon,
} from '../components/Icons';

type Feedback = { tone: 'ok' | 'error'; msg: string } | null;

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
      setApagarAberto(false);
      setFeedback({ tone: 'ok', msg: 'Todos os dados foram apagados.' });
    } catch (e) {
      setFeedback({ tone: 'error', msg: extrairErro(e) });
    } finally {
      setApagando(false);
    }
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
