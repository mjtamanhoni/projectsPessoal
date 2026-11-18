import { useEffect, useState } from 'react';
import { SPLASH_ICON } from '../splash-icon';
import { detectarRegiaoDetalhada, getRegiaoSalva, type ResultadoDeteccao } from '../localizacao';

interface Props {
  onFinalizar: () => void;
}

const TEMPO_MINIMO_MS = 1600;
const TEMPO_MAXIMO_MS = 9000;
const AVISO_DEMORA_MS = 3000;

export default function SplashScreen({ onFinalizar }: Props) {
  const [etapa, setEtapa] = useState(0);
  const [localizando, setLocalizando] = useState(true);
  const [resultado, setResultado] = useState<ResultadoDeteccao | null>(null);
  const [demorando, setDemorando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const espera = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const t1 = setTimeout(() => setEtapa(1), 50);
    const t2 = setTimeout(() => setEtapa(2), 350);
    const t3 = setTimeout(() => setEtapa(3), 700);
    const tDemora = setTimeout(() => {
      if (ativo) setDemorando(true);
    }, AVISO_DEMORA_MS);

    (async () => {
      const deteccao = detectarRegiaoDetalhada().catch(
        (): ResultadoDeteccao => ({ regiao: null, origem: 'nenhuma' }),
      );
      const limite = espera(TEMPO_MAXIMO_MS).then((): ResultadoDeteccao | null => null);
      const [, detectado] = await Promise.all([
        espera(TEMPO_MINIMO_MS),
        Promise.race([deteccao, limite]),
      ]);
      if (!ativo) return;

      clearTimeout(tDemora);
      const cache = getRegiaoSalva();
      const final: ResultadoDeteccao = detectado ?? (cache
        ? { regiao: cache, origem: 'cache' }
        : { regiao: null, origem: 'nenhuma' });

      setResultado(final);
      setLocalizando(false);
      setDemorando(false);

      setTimeout(() => {
        if (ativo) setEtapa(4);
      }, 700);
      setTimeout(() => {
        if (ativo) onFinalizar();
      }, 1150);
    })();

    return () => {
      ativo = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tDemora);
    };
  }, [onFinalizar]);

  const entrada = etapa >= 1;
  const logoVisivel = etapa >= 2;
  const textoVisivel = etapa >= 3;
  const saindo = etapa >= 4;
  const regiao = resultado?.regiao ?? null;

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
        transition: 'opacity 0.45s ease-out',
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
          alt="Chegou"
          style={{
            width: 180,
            height: 180,
            objectFit: 'contain',
            borderRadius: 36,
            filter: logoVisivel ? 'drop-shadow(0 8px 24px rgba(255, 184, 0, 0.4))' : 'none',
          }}
        />
      </div>

      {/* Status da localizacao */}
      <div
        style={{
          marginTop: 28,
          textAlign: 'center',
          maxWidth: 300,
          minHeight: 76,
          padding: '0 20px',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          transform: textoVisivel ? 'translateY(0)' : 'translateY(12px)',
          opacity: textoVisivel ? 1 : 0,
        }}
      >
        {localizando ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#FFB800',
                  animation: 'dotPulse 1.2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.9)',
                  letterSpacing: 0.4,
                }}
              >
                Localizando sua região...
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 0.3,
                marginTop: 9,
                lineHeight: 1.6,
              }}
            >
              {demorando
                ? 'Isso pode levar alguns segundos. Aguarde...'
                : 'Vamos usar sua localização para mostrar as empresas que entregam na sua cidade.'}
            </div>
          </>
        ) : regiao ? (
          <>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#34C759',
                letterSpacing: 0.5,
              }}
            >
              {regiao.cidade}/{regiao.uf}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: 0.3,
                marginTop: 9,
                lineHeight: 1.6,
              }}
            >
              {resultado?.origem === 'gps'
                ? 'Região identificada. Mostrando empresas que entregam aqui.'
                : 'Usando sua última localização conhecida.'}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
                letterSpacing: 0.4,
                lineHeight: 1.5,
              }}
            >
              Não foi possível identificar sua região
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 0.3,
                marginTop: 9,
                lineHeight: 1.6,
              }}
            >
              Mostrando todas as empresas disponíveis.
            </div>
          </>
        )}
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
          opacity: textoVisivel && localizando ? 1 : 0,
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
              animation: localizando ? `dotPulse 1.4s ease-in-out ${i * 0.15}s infinite` : 'none',
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
