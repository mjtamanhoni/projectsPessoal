import { useEffect, useState } from 'react';
import { SPLASH_ICON } from '../splash-icon';

interface Props {
  onFinalizar: () => void;
}

export default function SplashScreen({ onFinalizar }: Props) {
  const [animacao, setAnimacao] = useState<'entrada' | 'visivel' | 'saida'>('entrada');

  useEffect(() => {
    const t1 = setTimeout(() => setAnimacao('visivel'), 100);
    const t2 = setTimeout(() => setAnimacao('saida'), 2800);
    const t3 = setTimeout(() => onFinalizar(), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinalizar]);

  const visivel = animacao === 'visivel';
  const saindo = animacao === 'saida';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0a1a12 0%, #1b3a28 40%, #0a1a12 100%)',
        transition: 'opacity 0.6s ease-out',
        opacity: saindo ? 0 : 1,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 160,
          height: 160,
          marginBottom: 32,
        }}
      >
        {/* Anel pulsante */}
        <div
          style={{
            position: 'absolute',
            inset: -12,
            borderRadius: '50%',
            border: '2px solid rgba(45, 106, 79, 0.4)',
            transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transform: visivel ? 'scale(1.3)' : 'scale(0.8)',
            opacity: visivel ? 0 : 0.6,
            animation: visivel ? 'none' : undefined,
          }}
        />
        {/* Anel interno */}
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '1.5px solid rgba(45, 106, 79, 0.25)',
            transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s',
            transform: visivel ? 'scale(1.15)' : 'scale(0.9)',
            opacity: visivel ? 0 : 0.4,
          }}
        />
        {/* Ícone */}
        <img
          src={SPLASH_ICON}
          alt="Chegou"
          style={{
            width: 160,
            height: 160,
            objectFit: 'contain',
            borderRadius: 32,
            transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: visivel ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-15deg)',
            filter: visivel ? 'drop-shadow(0 8px 24px rgba(45, 106, 79, 0.5))' : 'none',
          }}
        />
      </div>

      {/* Nome do app */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: 2,
          fontFamily: "'Playfair Display', serif",
          transition: 'all 0.6s ease-out 0.3s',
          transform: visivel ? 'translateY(0)' : 'translateY(20px)',
          opacity: visivel ? 1 : 0,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        CHEGOU
      </div>

      {/* Subtítulo */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginTop: 8,
          transition: 'all 0.6s ease-out 0.5s',
          transform: visivel ? 'translateY(0)' : 'translateY(15px)',
          opacity: visivel ? 1 : 0,
        }}
      >
        Encomendas Online
      </div>

      {/* Linha decorativa */}
      <div
        style={{
          width: 40,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #2d6a4f, transparent)',
          marginTop: 16,
          borderRadius: 1,
          transition: 'all 0.8s ease-out 0.6s',
          transform: visivel ? 'scaleX(1)' : 'scaleX(0)',
          opacity: visivel ? 1 : 0,
        }}
      />

      {/* Indicador de carregamento */}
      <div
        style={{
          marginTop: 40,
          display: 'flex',
          gap: 6,
          transition: 'opacity 0.4s ease-out 0.7s',
          opacity: visivel ? 1 : 0,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#2d6a4f',
              animation: visivel ? `pulse 1.2s ease-in-out ${i * 0.2}s infinite` : 'none',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
