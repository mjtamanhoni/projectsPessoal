import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Minus, Plus, SlidersHorizontal } from 'lucide-react';
import type { AdicionalItemPedido, EncomendaItem, ProdutoAdicional, ProdutoVendaItem, ReceitaIngrediente, VendaProdutoItem } from '@/types';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export type ItemCustomizavel = (VendaProdutoItem | EncomendaItem) & { produto_nome?: string };

const carregarIngredientes = async (produtoFabricadoId: number): Promise<ReceitaIngrediente[]> => {
  try {
    const res = await api.get('/receitas-ingredientes', { params: { produto_fabricado_id: produtoFabricadoId } });
    return res.data as ReceitaIngrediente[];
  } catch {
    return [];
  }
};

const carregarAdicionaisDoProduto = async (produtoFabricadoId: number): Promise<ProdutoAdicional[]> => {
  try {
    const res = await api.get('/produtos-adicionais', { params: { produto_fabricado_id: produtoFabricadoId } });
    return res.data as ProdutoAdicional[];
  } catch {
    return [];
  }
};

const carregarItensDoProdutoVenda = async (produtoVendaId: number): Promise<ProdutoVendaItem[]> => {
  try {
    const res = await api.get('/produtos-venda-itens', { params: { produto_venda_id: produtoVendaId } });
    return res.data as ProdutoVendaItem[];
  } catch {
    return [];
  }
};

interface ItemCustomizacaoModalProps {
  isOpen: boolean;
  item: ItemCustomizavel | null;
  onConfirmar: (item: ItemCustomizavel) => void;
  onFechar: () => void;
}

export function ItemCustomizacaoModal({ isOpen, item, onConfirmar, onFechar }: ItemCustomizacaoModalProps) {
  const produtoFabricadoId = item?.produto_fabricado_id ?? 0;
  const produtoVendaId = item?.produto_venda_id ?? 0;
  const [ingredientes, setIngredientes] = useState<ReceitaIngrediente[]>([]);
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<ProdutoAdicional[]>([]);
  const [pvItens, setPvItens] = useState<ProdutoVendaItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [removidos, setRemovidos] = useState<(string | { nome: string; produto_venda_item_id?: number })[]>([]);
  const [adicionais, setAdicionais] = useState<AdicionalItemPedido[]>([]);

  useEffect(() => {
    if (!isOpen || (!produtoFabricadoId && !produtoVendaId)) return;
    setCarregando(true);
    const normalizarRemovidos = (item?.removidos ?? []).map((r) =>
      typeof r === 'string' ? r : { nome: r.nome, produto_venda_item_id: r.produto_venda_item_id },
    );
    const promessas: Promise<unknown>[] = [];
    if (produtoFabricadoId) {
      promessas.push(
        carregarIngredientes(produtoFabricadoId).then((ing) => setIngredientes(ing)),
        carregarAdicionaisDoProduto(produtoFabricadoId).then((adic) => setAdicionaisDisponiveis(adic)),
      );
    }
    if (produtoVendaId) {
      promessas.push(carregarItensDoProdutoVenda(produtoVendaId).then((itens) => setPvItens(itens)));
    }
    setRemovidos(normalizarRemovidos);
    setAdicionais(item?.adicionais ?? []);
    Promise.all(promessas).finally(() => setCarregando(false));
  }, [isOpen, produtoFabricadoId, produtoVendaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRemovido = (nome: string) => {
    setRemovidos((prev) => {
      if (prev.includes(nome)) return prev.filter((r) => r !== nome);
      return [...prev, nome];
    });
  };

  const pvRemovido = (pviId: number | undefined) =>
    removidos.some((r) => typeof r === 'object' && r.produto_venda_item_id === pviId);

  const toggleRemovidoPv = (item: ProdutoVendaItem) => {
    setRemovidos((prev) => {
      const jaRemovido = prev.some((r) => typeof r === 'object' && r.produto_venda_item_id === item.id);
      if (jaRemovido) return prev.filter((r) => !(typeof r === 'object' && r.produto_venda_item_id === item.id));
      return [...prev, { nome: item.nome, produto_venda_item_id: item.id }];
    });
  };

  const pvAdicionalQtd = (pviId: number | undefined) => {
    const existente = adicionais.find((a) => a.produto_venda_item_id === pviId);
    return existente?.quantidade ?? 0;
  };

  const mudarAdicionalPv = (item: ProdutoVendaItem, delta: number) => {
    const pviId = item.id;
    const preco = Number(item.preco_adicional ?? 0);
    setAdicionais((prev) => {
      const atual = prev.find((a) => a.produto_venda_item_id === pviId);
      const novaQtd = Math.max(0, (atual?.quantidade ?? 0) + delta);
      const restante = prev.filter((a) => a.produto_venda_item_id !== pviId);
      if (novaQtd === 0) return restante;
      return [...restante, { produto_venda_item_id: pviId, nome: item.nome, quantidade: novaQtd, valor_unitario: preco, valor_total: novaQtd * preco }];
    });
  };

  const adicionalQuantidade = (adicionalId: number) => {
    const existente = adicionais.find((a) => a.adicional_id === adicionalId);
    return existente?.quantidade ?? 0;
  };

  const mudarQuantidadeAdicional = (adicional: ProdutoAdicional, delta: number) => {
    const id = adicional.adicional_id;
    const nome = adicional.adicional_nome ?? `Adicional ${id}`;
    const preco = Number(adicional.adicional_preco ?? 0);
    setAdicionais((prev) => {
      const atual = prev.find((a) => a.adicional_id === id);
      const novaQtd = Math.max(0, (atual?.quantidade ?? 0) + delta);
      const restante = prev.filter((a) => a.adicional_id !== id);
      if (novaQtd === 0) return restante;
      return [...restante, { adicional_id: id, nome, quantidade: novaQtd, valor_unitario: preco, valor_total: novaQtd * preco }];
    });
  };

  const totalAdicionais = useMemo(
    () => adicionais.reduce((acc, a) => acc + a.valor_unitario * a.quantidade, 0),
    [adicionais],
  );

  const valorFinalItem = item ? item.quantidade * item.valor_unitario + totalAdicionais : 0;

  const confirmar = () => {
    if (!item) return;
    const atualizado: ItemCustomizavel = {
      ...item,
      removidos: removidos.length > 0 ? removidos : undefined,
      adicionais: adicionais.length > 0 ? adicionais : undefined,
      valor_total: valorFinalItem,
    };
    onConfirmar(atualizado);
  };

  return (
    <Modal isOpen={isOpen} onClose={onFechar} title={`Personalizar: ${item?.produto_venda_nome ?? item?.produto_nome ?? `Produto ${produtoFabricadoId || produtoVendaId}`}`} maxWidth="max-w-2xl">
      {carregando ? (
        <p className="py-8 text-center text-sm text-text-tertiary">Carregando opções...</p>
      ) : (
        <div className="space-y-5">
          {pvItens.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <SlidersHorizontal size={14} /> Itens do produto de venda
              </p>
              <div className="border border-border-primary rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 text-text-secondary font-medium">Item</th>
                      <th className="text-left px-3 py-2 text-text-secondary font-medium">Remover</th>
                      <th className="text-right px-3 py-2 text-text-secondary font-medium">Adicionar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pvItens.map((pvi) => {
                      const podeRemover = Boolean(pvi.pode_remover);
                      const podeAdicionar = Boolean(pvi.pode_adicionar);
                      const marcado = pvRemovido(pvi.id);
                      const qtd = pvAdicionalQtd(pvi.id);
                      const preco = Number(pvi.preco_adicional ?? 0);
                      return (
                        <tr key={pvi.id} className="border-t border-border-primary">
                          <td className="px-3 py-2">
                            <p className={`font-medium ${marcado ? 'line-through text-text-tertiary' : ''}`}>{pvi.nome}</p>
                            {podeAdicionar && preco > 0 && (
                              <p className="text-xs text-text-tertiary">+ {formatCurrency(preco)} por unidade</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {podeRemover ? (
                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={marcado}
                                  onChange={() => toggleRemovidoPv(pvi)}
                                  className="rounded border-border-subtle"
                                />
                                <span className="text-xs text-text-tertiary">{marcado ? 'Remover' : 'Manter'}</span>
                              </label>
                            ) : (
                              <span className="text-xs text-text-tertiary">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {podeAdicionar ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => mudarAdicionalPv(pvi, -1)}
                                  disabled={qtd === 0}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border-primary hover:bg-bg-muted disabled:opacity-30 transition"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center text-sm font-medium">{qtd > 0 ? qtd : '-'}</span>
                                <button
                                  type="button"
                                  onClick={() => mudarAdicionalPv(pvi, 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border-primary hover:bg-bg-muted transition"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-text-tertiary">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {produtoFabricadoId > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <SlidersHorizontal size={14} /> Remover ingredientes
              </p>
            {ingredientes.length === 0 ? (
              <p className="text-xs text-text-tertiary">Produto sem receita de ingredientes.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ingredientes.map((ing) => {
                  const marcado = removidos.includes(ing.insumo_nome ?? '');
                  return (
                    <label
                      key={ing.id ?? ing.insumo_id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${marcado ? 'border-accent-red bg-accent-red/10' : 'border-border-primary hover:bg-bg-muted'}`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => toggleRemovido(ing.insumo_nome ?? '')}
                        className="rounded border-border-subtle"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${marcado ? 'line-through text-text-tertiary' : ''}`}>{ing.insumo_nome ?? 'Ingrediente'}</p>
                        <p className="text-[11px] text-text-tertiary">{formatarQuantidade(ing.quantidade)}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {produtoFabricadoId > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">Adicionais</p>
            {adicionaisDisponiveis.length === 0 ? (
              <p className="text-xs text-text-tertiary">Este produto não possui adicionais cadastrados.</p>
            ) : (
              <div className="border border-border-primary rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 text-text-secondary font-medium">Adicional</th>
                      <th className="text-right px-3 py-2 text-text-secondary font-medium">Preço</th>
                      <th className="text-center px-3 py-2 text-text-secondary font-medium">Quantidade</th>
                      <th className="text-right px-3 py-2 text-text-secondary font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adicionaisDisponiveis.map((adicional) => {
                      const qtd = adicionalQuantidade(adicional.adicional_id);
                      const preco = Number(adicional.adicional_preco ?? 0);
                      return (
                        <tr key={adicional.adicional_id} className="border-t border-border-primary">
                          <td className="px-3 py-2">
                            <p className="font-medium">{adicional.adicional_nome ?? `Adicional ${adicional.adicional_id}`}</p>
                            {adicional.adicional_descricao && (
                              <p className="text-xs text-text-tertiary">{adicional.adicional_descricao}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{formatCurrency(preco)}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => mudarQuantidadeAdicional(adicional, -1)}
                                disabled={qtd === 0}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-border-primary hover:bg-bg-muted disabled:opacity-30 transition"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{qtd > 0 ? qtd : '-'}</span>
                              <button
                                type="button"
                                onClick={() => mudarQuantidadeAdicional(adicional, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-border-primary hover:bg-bg-muted transition"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{qtd > 0 ? formatCurrency(qtd * preco) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border-primary pt-3">
            <div className="space-y-0.5">
              <p className="text-xs text-text-tertiary">
                {item ? `${item.quantidade.toFixed(2).replace('.', ',')} x ${formatCurrency(item.valor_unitario)}` : ''}{' '}
                {totalAdicionais > 0 && <span className="text-accent-green">+ {formatCurrency(totalAdicionais)} adicionais</span>}
              </p>
              <p className="text-sm font-semibold">Total do item: {formatCurrency(valorFinalItem)}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onFechar}>Cancelar</Button>
              <Button type="button" onClick={confirmar}>Aplicar</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function formatarQuantidade(valor: number): string {
  return `${valor.toFixed(3).replace('.', ',')}`;
}