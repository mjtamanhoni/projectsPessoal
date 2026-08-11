import { useMemo, useState } from 'react';

export function normalizar(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

interface Props<T> {
  titulo: string;
  placeholder: string;
  registros: T[];
  rotulo: (r: T) => string;
  subtitulo?: (r: T) => string | undefined;
  buscar?: (r: T, termo: string) => boolean;
  aoSelecionar: (r: T) => void;
  fechar: () => void;
}

export default function SeletorRegistro<T>({ titulo, placeholder, registros, rotulo, subtitulo, buscar, aoSelecionar, fechar }: Props<T>) {
  const [termo, setTermo] = useState('');

  const filtrados = useMemo(() => {
    const t = normalizar(termo.trim());
    if (!t) return registros;
    if (buscar) return registros.filter((r) => buscar(r, t));
    return registros.filter((r) => normalizar(rotulo(r)).includes(t));
  }, [registros, termo, buscar, rotulo]);

  return (
    <div className="sel-overlay">
      <div className="sel-header">
        <div className="sel-title">{titulo}</div>
        <button className="sel-close" onClick={fechar} aria-label="Fechar">
          ✕
        </button>
        <div className="sel-search-box">
          <span className="sel-search-icon">🔍</span>
          <input
            className="sel-search"
            placeholder={placeholder}
            value={termo}
            autoFocus
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>
        <div className="sel-count">
          {filtrados.length} {filtrados.length === 1 ? 'registro' : 'registros'}
        </div>
      </div>

      <div className="sel-list">
        {filtrados.length === 0 && <div className="sel-empty">Nenhum registro encontrado</div>}
        {filtrados.map((r) => (
          <button key={String((r as Record<string, unknown>)['id'] ?? rotulo(r))} className="sel-row" onClick={() => aoSelecionar(r)}>
            <div className="sel-row-label">{rotulo(r)}</div>
            {subtitulo?.(r) && <div className="sel-row-sub">{subtitulo(r)}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

interface CampoSeletorProps {
  texto?: string;
  placeholder?: string;
  aoAbrir: () => void;
  style?: React.CSSProperties;
}

export function CampoSeletor({ texto, placeholder = 'Selecione...', aoAbrir, style }: CampoSeletorProps) {
  return (
    <button
      type="button"
      className="modal-input modal-select"
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        textAlign: 'left',
        cursor: 'pointer',
        paddingRight: 32,
        background: '#f9f8f6',
      }}
      onClick={aoAbrir}
    >
      <span
        style={{
          color: texto ? '#1b1f1c' : '#9ca09d',
          fontSize: 14,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          background: 'transparent',
        }}
      >
        {texto || placeholder}
      </span>
    </button>
  );
}