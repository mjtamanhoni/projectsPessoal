import { useCallback, useEffect, useState } from 'react';
import { ReceiptIcon } from './Icons';

interface Props {
  onFinalizar: () => void;
}

export function SplashScreen({ onFinalizar }: Props) {
  const [saindo, setSaindo] = useState(false);

  const finalizar = useCallback(() => {
    setSaindo(true);
    window.setTimeout(onFinalizar, 420);
  }, [onFinalizar]);

  useEffect(() => {
    const timer = window.setTimeout(finalizar, 3400);
    return () => window.clearTimeout(timer);
  }, [finalizar]);

  return (
    <div className={`splash${saindo ? ' splash-out' : ''}`}>
      <div className="splash-shade" />

      <div className="splash-fallback">
        <div className="splash-glow" />
        <img className="splash-logo-img" src="/splash-logo.png" alt="Títulos a Pagar" />
        <h1>Títulos a Pagar</h1>
        <p>Contas em dia, decisões melhores.</p>
        <div className="splash-dots" aria-label="Carregando">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="splash-brand">
        <span className="splash-brand-mark">
          <ReceiptIcon size={18} />
        </span>
        <span>Títulos a Pagar</span>
      </div>

      <button type="button" className="splash-skip" onClick={finalizar}>
        Pular
      </button>
    </div>
  );
}
