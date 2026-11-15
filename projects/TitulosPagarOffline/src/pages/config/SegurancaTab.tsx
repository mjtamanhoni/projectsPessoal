import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { definirPin, extrairErro, salvarConfig } from '../../data';
import { useConfig } from '../../security/ConfigProvider';
import { useLock } from '../../security/LockProvider';
import { Modal } from '../../components/Modal';
import { CheckIcon, EyeIcon, EyeOffIcon } from '../../components/Icons';
import { FeedbackBar, useFeedback } from './comum';

export function SegurancaTab() {
  const navigate = useNavigate();
  const { recarregar } = useConfig();
  const { temPin, biometriaDisponivel, biometriaAtiva, bloquear, atualizarEstado } = useLock();
  const { feedback, setFeedback } = useFeedback();

  const [pinAberto, setPinAberto] = useState(false);
  const [novoPin, setNovoPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [mostrarPin, setMostrarPin] = useState(false);
  const [erroPin, setErroPin] = useState('');
  const [salvandoPin, setSalvandoPin] = useState(false);

  const abrirPin = () => {
    setNovoPin('');
    setConfirmarPin('');
    setErroPin('');
    setMostrarPin(false);
    setPinAberto(true);
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

  return (
    <>
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

        <FeedbackBar feedback={feedback} />

        <div className="settings-actions">
          <button type="button" className="btn btn-ghost btn-block" onClick={abrirPin}>
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
          <p className="settings-hint">A biometria não está disponível neste aparelho.</p>
        )}
      </section>

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
    </>
  );
}
