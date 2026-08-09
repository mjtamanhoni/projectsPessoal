import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';

export interface RowActionDef {
  rotulo: string;
  icone: LucideIcon;
  cor?: string;
  onClick: () => void;
  permissaoRota?: string;
  permissaoAcao?: string;
}

interface RowActionsProps {
  rota?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  extras?: RowActionDef[];
}

const LARGURA_MENU = 176;
const ITEM_PADRAO_ALTURA = 38;

interface Posicao {
  left: number;
  top: number;
}

export function RowActions({ rota, onEdit, onDelete, extras }: RowActionsProps) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<Posicao | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const itens = [
    ...(extras ?? []),
    ...(onEdit
      ? [{ rotulo: 'Editar', icone: Pencil, cor: undefined, onClick: () => { setAberto(false); onEdit(); }, permissaoRota: rota, permissaoAcao: ACAO.EDITAR }]
      : []),
    ...(onDelete
      ? [{ rotulo: 'Excluir', icone: Trash2, cor: '#ef4444', onClick: () => { setAberto(false); onDelete(); }, permissaoRota: rota, permissaoAcao: ACAO.EXCLUIR }]
      : []),
  ];

  const calcularPosicao = useCallback((): Posicao | null => {
    const btn = botaoRef.current;
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const alturaMenu = itens.length * ITEM_PADRAO_ALTURA + 16;
    let left = rect.right - LARGURA_MENU;
    if (left < 8) left = 8;
    let top = rect.bottom + 4;
    if (top + alturaMenu > window.innerHeight - 8) {
      top = rect.top - alturaMenu - 4;
      if (top < 8) top = 8;
    }
    return { left, top };
  }, [itens]);

  const abrir = () => {
    const p = calcularPosicao();
    if (p) setPos(p);
    setAberto(true);
  };

  const fechar = useCallback(() => {
    setAberto(false);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (botaoRef.current?.contains(alvo) || menuRef.current?.contains(alvo)) return;
      fechar();
    };
    const aoRolar = () => fechar();
    const aoRedimensionar = () => fechar();
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', aoRedimensionar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, [aberto, fechar]);

  return (
    <div className="relative inline-block">
      <button
        ref={botaoRef}
        onClick={() => (aberto ? fechar() : abrir())}
        className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
        aria-label="Acoes"
      >
        <MoreHorizontal size={16} className="text-text-secondary" />
      </button>
      {aberto && pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ left: pos.left, top: pos.top, width: LARGURA_MENU }}
            className="fixed z-[200] mt-1 rounded-lg border border-border-primary bg-bg-card shadow-lg py-1"
          >
            {itens.map((item, idx) => {
              const botao = (
                <button
                  onClick={item.onClick}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-bg-muted transition-colors"
                >
                  <item.icone size={15} style={{ color: item.cor }} />
                  <span className="text-text-primary">{item.rotulo}</span>
                </button>
              );
              return item.permissaoRota && item.permissaoAcao ? (
                <ShowForPermission key={idx} rota={item.permissaoRota} acao={item.permissaoAcao}>
                  {botao}
                </ShowForPermission>
              ) : (
                <div key={idx}>{botao}</div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}