import { useEffect, useState } from 'react';
import { SPLASH_ICON } from '../splash-icon';

interface Props {
  onFinalizar: () => void;
}

export default function SplashScreen({ onFinalizar }: Props) {
  const [etapa, setEtapa] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setEtapa(1), 50);
    const t2 = setTimeout(() => setEtapa(2), 600);
    const t3 = setTimeout(() => setEtapa(3), 1200);
    const t4 = setTimeout(() => setEtapa(4), 2400);
    const t5 = setTimeout(() => onFinalizar(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onFinalizar]);

  const entrada = etapa >= 1;
  const logoVisivel = etapa >= 2;
  const textoVisivel = etapa >= 3;
  const saindo = etapa >= 4;

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
        background: '#000000',
        opacity: saindo ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      {/* Glow difuso */}
      <div
        style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,184,0,0.2) 0%, rgba(255,184,0,0.05) 40%, transparent 70%)',
          transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: entrada ? 'scale(1)' : 'scale(0.3)',
          opacity: entrada ? 1 : 0,
        }}
      />

      {/* Anel externo sutil */}
      <div
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: '50%',
          border: '1px solid rgba(255, 184, 0, 0.15)',
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
          transform: entrada ? 'scale(1)' : 'scale(0.6)',
          opacity: entrada ? 1 : 0,
        }}
      />

      {/* Logo */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: logoVisivel ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(10px)',
          opacity: logoVisivel ? 1 : 0,
        }}
      >
        <img
          src={SPLASH_ICON}
          alt="Chegou Parceiro"
          style={{
            width: 180,
            height: 180,
            objectFit: 'contain',
            borderRadius: 36,
            filter: logoVisivel ? 'drop-shadow(0 8px 24px rgba(255, 184, 0, 0.4))' : 'none',
          }}
        />
      </div>

      {/* Texto descritivo */}
      <div
        style={{
          marginTop: 28,
          textAlign: 'center',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          transform: textoVisivel ? 'translateY(0)' : 'translateY(12px)',
          opacity: textoVisivel ? 1 : 0,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: 1.5,
            lineHeight: 1.6,
            maxWidth: 260,
          }}
        >
          Gerencie sua produção
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: 0.5,
            marginTop: 6,
          }}
        >
          com eficiência e agilidade
        </div>
      </div>

      {/* Linha decorativa */}
      <div
        style={{
          width: 40,
          height: 1.5,
          background: 'linear-gradient(90deg, transparent, #FFB800, transparent)',
          marginTop: 24,
          borderRadius: 1,
          transition: 'all 0.8s ease-out 0.4s',
          transform: textoVisivel ? 'scaleX(1)' : 'scaleX(0)',
          opacity: textoVisivel ? 0.7 : 0,
        }}
      />

      {/* Loading dots */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          gap: 5,
          transition: 'opacity 0.4s ease-out 0.5s',
          opacity: textoVisivel ? 1 : 0,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#FFB800',
              animation: textoVisivel ? `dotPulse 1.4s ease-in-out ${i * 0.15}s infinite` : 'none',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.2; }
          40% { transform: scale(1.1); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
