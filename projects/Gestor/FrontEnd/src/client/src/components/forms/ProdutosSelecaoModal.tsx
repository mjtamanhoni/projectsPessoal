import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Minus, Plus, Search, Check, ImageOff } from 'lucide-react';
import type { ProdutoFabricado, ProdutoVenda } from '@/types';
import { formatCurrency, formatQuantityInput, fotoUrl } from '@/lib/utils';

export interface ProdutoSelecionado {
  produto_fabricado_id?: number;
  produto_venda_id?: number;
  produto_nome?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  removidos?: (string | { nome: string; produto_venda_item_id?: number })[];
  adicionais?: { adicional_id?: number; produto_venda_item_id?: number; nome: string; quantidade: number; valor_unitario: number; valor_total?: number }[];
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
    const somas = new Map<string, number>();
    for (const item of itens) {
      const chave = chaveDeItem(item);
      if (chave) somas.set(chave, (somas.get(chave) ?? 0) + item.quantidade);
    }
    const map: Record<string, string> = {};
    for (const [chave, qtd] of somas) {
      map[chave] = qtd.toFixed(2).replace('.', ',');
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

  const ajustarQtd = (chave: string, delta: number) => {
    setQtdsRaws((prev) => {
      const atual = prev[chave] ?? '1,00';
      const qtd = (parseInt(atual.replace(/\D/g, ''), 10) || 100) / 100;
      const nova = Math.max(1, qtd + delta);
      return { ...prev, [chave]: nova.toFixed(2).replace('.', ',') };
    });
  };

  const confirmar = () => {
    const valorUnitarioAtual = new Map(
      itens.map((i) => {
        const chave = chaveDeItem(i);
        return chave ? [chave, i.valor_unitario] : undefined;
      }).filter((x): x is [string, number] => Boolean(x)),
    );
    const novos: ProdutoSelecionado[] = [];
    for (const p of cards) {
      const raw = qtdsRaws[p.chave];
      if (raw === undefined) continue;
      const quantidade = (parseInt(raw.replace(/\D/g, ''), 10) || 1) / 100;
      const qtd = quantidade > 0 ? quantidade : 1;
      const valorUnitario = valorUnitarioAtual.get(p.chave) ?? p.preco;
      const base = {
        ...(p.ehVenda ? { produto_venda_id: p.vendaId } : { produto_fabricado_id: p.fabricadoId }),
        produto_nome: p.nome,
        valor_unitario: valorUnitario,
      };
      const existentes = itens.filter((i) => chaveDeItem(i) === p.chave);
      if (p.ehVenda && Number.isInteger(qtd) && qtd > 1) {
        const preservados = existentes.slice(0, qtd);
        const totalExistente = preservados.reduce((acc, e) => acc + e.quantidade, 0);
        const faltante = Math.round((qtd - totalExistente) * 100) / 100;
        novos.push(...preservados.map((e) => ({ ...e })));
        if (faltante > 0) {
          if (Number.isInteger(faltante)) {
            for (let i = 0; i < faltante; i++) {
              novos.push({ ...base, quantidade: 1, valor_total: valorUnitario });
            }
          } else {
            novos.push({ ...base, quantidade: faltante, valor_total: faltante * valorUnitario });
          }
        }
      } else {
        const existente = existentes[0];
        if (existente) {
          const totalAdicionais = (existente.adicionais ?? []).reduce((acc, a) => acc + Number(a.valor_total ?? 0), 0);
          novos.push({ ...existente, quantidade: qtd, valor_total: qtd * valorUnitario + totalAdicionais });
        } else {
          novos.push({ ...base, quantidade: qtd, valor_total: qtd * valorUnitario });
        }
      }
    }
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
                  <div className="mt-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => ajustarQtd(p.chave, -1)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-primary hover:bg-bg-muted transition"
                      title="Subtrair 1,00"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field h-7 flex-1 px-1 text-center text-xs"
                      value={raw}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => mudarQtd(p.chave, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => ajustarQtd(p.chave, 1)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-primary hover:bg-bg-muted transition"
                      title="Somar 1,00"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
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
