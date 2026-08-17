import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Search, Check, ImageOff } from 'lucide-react';
import type { ProdutoFabricado, ProdutoVenda } from '@/types';
import { formatCurrency, formatQuantityInput, fotoUrl } from '@/lib/utils';

export interface ProdutoSelecionado {
  produto_fabricado_id?: number;
  produto_venda_id?: number;
  produto_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface CardProduto {
  chave: string;
  nome: string;
  descricao?: string;
  preco: number;
  foto?: string;
  ehVenda: boolean;
  fabricadoId?: number;
  vendaId?: number;
}

interface ProdutosSelecaoModalProps {
  isOpen: boolean;
  titulo: string;
  produtos: ProdutoFabricado[];
  produtosVenda?: ProdutoVenda[];
  itens: ProdutoSelecionado[];
  onConfirmar: (itens: ProdutoSelecionado[]) => void;
  onFechar: () => void;
}

const chaveDeItem = (item: ProdutoSelecionado): string | undefined => {
  if (item.produto_venda_id) return `v${item.produto_venda_id}`;
  if (item.produto_fabricado_id) return `f${item.produto_fabricado_id}`;
  return undefined;
};

export function ProdutosSelecaoModal({ isOpen, titulo, produtos, produtosVenda = [], itens, onConfirmar, onFechar }: ProdutosSelecaoModalProps) {
  const [busca, setBusca] = useState('');
  const [qtdsRaws, setQtdsRaws] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setBusca('');
    const map: Record<string, string> = {};
    for (const item of itens) {
      const chave = chaveDeItem(item);
      if (chave) map[chave] = item.quantidade.toFixed(2).replace('.', ',');
    }
    setQtdsRaws(map);
  }, [isOpen, itens]);

  const precoProduto = (p: ProdutoFabricado) => p.preco ?? p.valor_venda_sugerido ?? 0;

  const cards: CardProduto[] = useMemo(() => {
    const fabricados: CardProduto[] = produtos.map((p) => ({
      chave: `f${p.id ?? p.codigo}`,
      nome: p.nome,
      descricao: p.descricao,
      preco: precoProduto(p),
      foto: p.foto,
      ehVenda: false,
      fabricadoId: p.id ?? p.codigo,
    }));
    const vendas: CardProduto[] = produtosVenda.map((p) => ({
      chave: `v${p.id ?? p.codigo}`,
      nome: p.nome,
      descricao: p.descricao,
      preco: Number(p.preco ?? 0),
      foto: p.foto,
      ehVenda: true,
      vendaId: p.id ?? p.codigo,
    }));
    return [...fabricados, ...vendas];
  }, [produtos, produtosVenda]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cards;
    return cards.filter((p) =>
      (p.nome ?? '').toLowerCase().includes(termo) || (p.descricao ?? '').toLowerCase().includes(termo)
    );
  }, [busca, cards]);

  const selecionadosCount = Object.keys(qtdsRaws).length;

  const toggleProduto = (p: CardProduto) => {
    setQtdsRaws((prev) => {
      const next = { ...prev };
      if (next[p.chave] !== undefined) {
        delete next[p.chave];
      } else {
        next[p.chave] = '1,00';
      }
      return next;
    });
  };

  const mudarQtd = (chave: string, raw: string) => {
    setQtdsRaws((prev) => ({ ...prev, [chave]: formatQuantityInput(raw, 2) }));
  };

  const confirmar = () => {
    const valorUnitarioAtual = new Map(
      itens.map((i) => {
        const chave = chaveDeItem(i);
        return chave ? [chave, i.valor_unitario] : undefined;
      }).filter((x): x is [string, number] => Boolean(x)),
    );
    const novos: ProdutoSelecionado[] = cards
      .filter((p) => qtdsRaws[p.chave] !== undefined)
      .map((p) => {
        const quantidade = (parseInt(qtdsRaws[p.chave].replace(/\D/g, ''), 10) || 1) / 100;
        const valorUnitario = valorUnitarioAtual.get(p.chave) ?? p.preco;
        return {
          ...(p.ehVenda ? { produto_venda_id: p.vendaId } : { produto_fabricado_id: p.fabricadoId }),
          produto_nome: p.nome,
          quantidade: quantidade > 0 ? quantidade : 1,
          valor_unitario: valorUnitario,
          valor_total: quantidade * valorUnitario,
        };
      });
    onConfirmar(novos);
  };

  return (
    <Modal isOpen={isOpen} onClose={onFechar} title={titulo} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            autoFocus
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar produto por nome ou descrição..."
            className="input-field pl-9"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {filtrados.map((p) => {
            const raw = qtdsRaws[p.chave];
            const selecionado = raw !== undefined;
            return (
              <div
                key={p.chave}
                onClick={() => toggleProduto(p)}
                className={`cursor-pointer rounded-lg border p-2 transition ${selecionado ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border-primary hover:border-accent'}`}
              >
                <div className="relative">
                  {p.foto ? (
                    <div className="mb-1 flex h-16 items-center justify-center rounded-md bg-bg-muted overflow-hidden">
                      <img src={fotoUrl(p.foto)} alt={p.nome} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="mb-1 flex h-16 items-center justify-center rounded-md bg-bg-muted">
                      <ImageOff size={16} className="text-text-tertiary" />
                    </div>
                  )}
                  {selecionado && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <p className="truncate text-sm font-medium">{p.nome}</p>
                {p.descricao && <p className="line-clamp-2 text-[11px] text-text-tertiary">{p.descricao}</p>}
                <p className="mt-0.5 text-sm font-semibold">{formatCurrency(p.preco)}</p>
                {selecionado && (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input-field mt-1 text-xs"
                    value={raw}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => mudarQtd(p.chave, e.target.value)}
                  />
                )}
              </div>
            );
          })}
          {filtrados.length === 0 && (
            <p className="col-span-full py-4 text-center text-sm text-text-tertiary">Nenhum produto encontrado</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-primary pt-2">
          <span className="text-sm text-text-secondary">{selecionadosCount} produto(s) selecionado(s)</span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onFechar}>Cancelar</Button>
            <Button type="button" onClick={confirmar} disabled={selecionadosCount === 0}>
              Confirmar Seleção
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
