import { useState, type CSSProperties, type MouseEvent } from 'react';

export interface RowMenuOpcao {
  rotulo: string;
  cor?: string;
  onPress: () => void;
  disabled?: boolean;
}

interface RowMenuProps {
  opcoes: RowMenuOpcao[];
  style?: CSSProperties;
  className?: string;
  fontSize?: number;
  stopPropagacao?: boolean;
}

export default function RowMenu({ opcoes, style, className = 'row-btn', fontSize = 18, stopPropagacao = false }: RowMenuProps) {
  const [aberto, setAberto] = useState(false);

  const abrir = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (stopPropagacao) e.stopPropagation();
    setAberto(true);
  };

  const fechar = (e?: MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setAberto(false);
  };

  return (
    <>
      <button
        className={className}
        style={{ ...style, color: style?.color ?? '#4a4f4b', fontSize, fontWeight: 700 }}
        onClick={abrir}
        aria-label="Menu de opções"
      >
        ⋮
      </button>
      {aberto && (
        <div className="row-menu-overlay" onClick={(e) => fechar(e)}>
          <div className="row-menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="row-menu-titulo">Opções</div>
            {opcoes.map((o) => (
              <button
                key={o.rotulo}
                className="row-menu-item"
                style={{ color: o.cor ?? '#1b1f1c' }}
                disabled={o.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setAberto(false);
                  o.onPress();
                }}
              >
                {o.rotulo}
              </button>
            ))}
            <button className="row-menu-item row-menu-cancelar" onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}