import { useEffect, useState } from 'react';
import { verificarVersao, getBaseURL, VERSAO_APP } from '../api';

interface Props {
  visivel: boolean;
}

function getLastDismissed(): string {
  try { return localStorage.getItem('versao_desistida') || ''; } catch { return ''; }
}
function setLastDismissed(v: string) {
  try { localStorage.setItem('versao_desistida', v); } catch { /* ok */ }
}

export default function VersionBanner({ visivel }: Props) {
  const [novaVersao, setNovaVersao] = useState<{ versao: string; arquivo: string } | null>(null);

  useEffect(() => {
    if (!visivel) return;
    const timer = setTimeout(() => {
      console.log('[VersionBanner] Verificando versão... VERSAO_APP=', VERSAO_APP);
      verificarVersao().then((v) => {
        console.log('[VersionBanner] Resultado:', v);
        if (v) {
          // Don't show if user already dismissed this exact version
          if (getLastDismissed() === v.versao) {
            console.log('[VersionBanner] Versão já dispensada:', v.versao);
            return;
          }
          setNovaVersao(v);
        }
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [visivel]);

  if (!visivel || !novaVersao) return null;

  const baseURL = getBaseURL();
  const downloadUrl = `${baseURL}/apk/${encodeURIComponent(novaVersao.arquivo)}?app=cliente`;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #FF6B35, #FF3B30)',
        color: '#FFFFFF',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 9999,
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onClick={() => { window.open(downloadUrl, '_blank'); }}
    >
      <span style={{ fontSize: 18 }}>🔄</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>
          Nova versão disponível (v{novaVersao.versao})
        </div>
        <div style={{ fontSize: 10, opacity: 0.85 }}>
          Toque para atualizar (sua versão: v{VERSAO_APP})
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setLastDismissed(novaVersao.versao);
          setNovaVersao(null);
        }}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: '#FFF',
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Depois
      </button>
    </div>
  );
}
