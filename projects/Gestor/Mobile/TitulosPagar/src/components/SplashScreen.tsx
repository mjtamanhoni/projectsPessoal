import { useCallback, useEffect, useState } from 'react';
import { ReceiptIcon } from './Icons';

interface Props {
  onFinalizar: () => void;
}

export function SplashScreen({ onFinalizar }: Props) {
  const [saindo, setSaindo] = useState(false);
  const [videoFalhou, setVideoFalhou] = useState(false);

  const finalizar = useCallback(() => {
    setSaindo(true);
    window.setTimeout(onFinalizar, 420);
  }, [onFinalizar]);

  useEffect(() => {
    const timer = window.setTimeout(finalizar, videoFalhou ? 3400 : 6000);
    return () => window.clearTimeout(timer);
  }, [finalizar, videoFalhou]);

  return (
    <div className={`splash${saindo ? ' splash-out' : ''}`}>
      {!videoFalhou && (
        <video
          className="splash-video"
          src="/splash.mp4"
          poster="/splash-poster.svg"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={finalizar}
          onError={() => setVideoFalhou(true)}
        />
      )}

      <div className="splash-shade" />

      {videoFalhou && (
        <div className="splash-fallback">
          <div className="splash-glow" />
          <div className="splash-logo">
            <ReceiptIcon size={64} />
          </div>
          <h1>Títulos a Pagar</h1>
          <p>Contas em dia, decisões melhores.</p>
          <div className="splash-dots" aria-label="Carregando">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}

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
