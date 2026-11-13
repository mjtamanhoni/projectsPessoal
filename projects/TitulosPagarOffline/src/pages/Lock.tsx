import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { VERSAO_APP, limparDados, removerPin } from '../data';
import { useLock } from '../security/LockProvider';
import { Modal } from '../components/Modal';
import { CheckIcon } from '../components/Icons';

type Etapa = 'pin' | 'confirmar';

export function Lock() {
  const navigate = useNavigate();
  const {
    estado,
    biometriaDisponivel,
    biometriaAtiva,
    criarPin,
    desbloquear,
    desbloquearComBiometria,
    pularPin,
    atualizarEstado,
  } = useLock();

  const [etapa, setEtapa] = useState<Etapa>('pin');
  const [pin, setPin] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [esqueciAberto, setEsqueciAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const primeiroUso = estado === 'primeiro-uso';
  const podeBiometria = !primeiroUso && biometriaAtiva && biometriaDisponivel;

  useEffect(() => {
    inputRef.current?.focus();
  }, [etapa, estado]);

  if (estado === 'desbloqueado') {
    return <Navigate to="/dashboard" replace />;
  }

  const limpar = () => {
    setPin('');
    setConfirmacao('');
    setErro('');
  };

  const continuar = async () => {
    setErro('');
    if (pin.length < 4) {
      setErro('O PIN deve ter pelo menos 4 dígitos.');
      return;
    }
    if (etapa === 'pin') {
      setEtapa('confirmar');
      return;
    }
    if (pin !== confirmacao) {
      setErro('Os PINs não conferem. Digite novamente.');
      setConfirmacao('');
      return;
    }
    setOcupado(true);
    try {
      await criarPin(pin);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Nǜo foi poss��vel salvar o PIN.');
      setEtapa('pin');
      setPin('');
      setConfirmacao('');
    } finally {
      setOcupado(false);
    }
  };

  const entrar = async () => {
    if (!pin) return;
    setOcupado(true);
    setErro('');
    try {
      const ok = await desbloquear(pin);
      if (!ok) {
        setErro('PIN incorreto. Tente novamente.');
        setPin('');
      }
    } finally {
      setOcupado(false);
    }
  };

  const usarBiometria = async () => {
    setOcupado(true);
    setErro('');
    try {
      const ok = await desbloquearComBiometria();
      if (!ok) setErro('Não foi possível confirmar a biometria.');
    } finally {
      setOcupado(false);
    }
  };

  const apagarTudo = async () => {
    setOcupado(true);
    try {
      await limparDados();
      await removerPin();
      setEsqueciAberto(false);
      limpar();
      setEtapa('pin');
      await atualizarEstado();
      pularPin();
    } finally {
      setOcupado(false);
    }
  };

  if (estado === 'carregando') {
    return (
      <div className="screen login-screen">
        <div className="loading-state">
          <div className="spinner" />
          <span>Preparando seus dados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="screen login-screen">
      <div className="screen-glow" />

      <header className="login-header">
        <div className="brand-mark brand-logo">
          <img src="/logo-icon.png" alt="Títulos a Pagar" />
        </div>
        <h1>Títulos a Pagar</h1>
        <p>
          {primeiroUso
            ? 'Crie um PIN para proteger suas contas.'
            : 'Digite seu PIN para desbloquear.'}
        </p>
      </header>

      <main className="login-card">
        {primeiroUso && (
          <p className="lock-hint">
            {etapa === 'pin'
              ? 'Escolha um PIN de 4 a 8 dígitos. Ele fica apenas neste aparelho.'
              : 'Digite o mesmo PIN novamente para confirmar.'}
          </p>
        )}

        <label className="field">
          <span>{etapa === 'confirmar' ? 'Confirme o PIN' : 'PIN'}</span>
          <input
            ref={inputRef}
            className="input pin-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={8}
            placeholder="••••"
            value={etapa === 'confirmar' ? confirmacao : pin}
            onChange={(event) => {
              const valor = event.target.value.replace(/\D/g, '').slice(0, 8);
              if (etapa === 'confirmar') setConfirmacao(valor);
              else setPin(valor);
              setErro('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                if (primeiroUso) void continuar();
                else void entrar();
              }
            }}
          />
        </label>

        {erro && <p className="form-error">{erro}</p>}

        {primeiroUso ? (
          <>
            <button
              type="button"
              className="btn btn-primary btn-block btn-lg"
              onClick={() => void continuar()}
              disabled={ocupado || pin.length < 4}
            >
              {etapa === 'pin' ? 'Continuar' : 'Criar PIN'}
            </button>

            {etapa === 'confirmar' && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => {
                  setEtapa('pin');
                  limpar();
                }}
                disabled={ocupado}
              >
                Voltar
              </button>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={pularPin}
              disabled={ocupado}
            >
              Pular por enquanto
            </button>
            <p className="lock-hint small">
              Você pode ativar o PIN depois em Configurações.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary btn-block btn-lg"
              onClick={() => void entrar()}
              disabled={ocupado || pin.length < 4}
            >
              {ocupado ? 'Verificando...' : 'Desbloquear'}
            </button>

            {podeBiometria && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => void usarBiometria()}
                disabled={ocupado}
              >
                <CheckIcon size={18} /> Desbloquear com biometria
              </button>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => setEsqueciAberto(true)}
              disabled={ocupado}
            >
              Esqueci o PIN
            </button>
          </>
        )}
      </main>

      <footer className="login-footer">
        <span>v{VERSAO_APP}</span>
        <span>Dados salvos neste aparelho</span>
      </footer>

      {esqueciAberto && (
        <Modal
          title="Esqueci o PIN"
          subtitle="O PIN não pode ser recuperado"
          onClose={() => {
            if (!ocupado) setEsqueciAberto(false);
          }}
        >
          <p className="confirm-text">
            Por segurança, o PIN é guardado criptografado e não pode ser recuperado. Se você
            esquecer o PIN, a única alternativa é apagar todos os dados do app e recomeçar.
          </p>
          <p className="confirm-text">
            Se você tem um backup exportado, poderá restaurá-lo depois em Configurações.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEsqueciAberto(false)}
              disabled={ocupado}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void apagarTudo()}
              disabled={ocupado}
            >
              {ocupado ? 'Apagando...' : 'Apagar dados e recomeçar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
