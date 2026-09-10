import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { verificarVersao, getBaseURL, VERSAO_APP } from '../api';

interface Props {
  visivel: boolean;
}

function getLastDismissed(): string {
  try { return localStorage.getItem('producao.versao_desistida') || ''; } catch { return ''; }
}
function setLastDismissed(v: string) {
  try { localStorage.setItem('producao.versao_desistida', v); } catch { /* ok */ }
}

export default function VersionBanner({ visivel }: Props) {
  const [novaVersao, setNovaVersao] = useState<{ versao: string; arquivo: string } | null>(null);

  useEffect(() => {
    if (!visivel) return;
    const timer = setTimeout(() => {
      verificarVersao().then((v) => {
        if (v) {
          if (getLastDismissed() === v.versao) return;
          setNovaVersao(v);
        }
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [visivel]);

  if (!visivel || !novaVersao) return null;

  const baseURL = getBaseURL();
  const downloadUrl = `${baseURL}/apk/${encodeURIComponent(novaVersao.arquivo)}?app=producao`;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        background: 'linear-gradient(135deg, #FF6B35, #FF3B30)',
        color: '#FFFFFF',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 9999,
        cursor: 'pointer',
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
    </div>,
    document.body
  );
}
