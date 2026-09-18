import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus, SlidersHorizontal, Trash2, CreditCard } from 'lucide-react';
import type { Encomenda, EncomendaItem, ProdutoFabricado, ProdutoVenda, Cliente, FormaPagamento, BandeiraCartao, EncomendaPagamento } from '@/types';
import { formatCurrency, formatDecimals } from '@/lib/utils';
import { ProdutosSelecaoModal, type ProdutoSelecionado } from '@/components/forms/ProdutosSelecaoModal';
import { ItemCustomizacaoModal, type ItemCustomizavel } from '@/components/forms/ItemCustomizacaoModal';
import { PagamentoMultiploModal } from '@/components/forms/PagamentoMultiploModal';

interface EncomendaFormProps {
  onSubmit: (data: Encomenda) => void;
  onCancel: () => void;
  initial?: Encomenda | null;
  produtos: ProdutoFabricado[];
  produtosVenda?: ProdutoVenda[];
  clientes: Cliente[];
  formasPagamento?: FormaPagamento[];
  bandeirasCartao?: BandeiraCartao[];
}

export function EncomendaForm({ onSubmit, onCancel, initial, produtos, produtosVenda = [], clientes, formasPagamento = [], bandeirasCartao = [] }: EncomendaFormProps) {
  const [clienteId, setClienteId] = useState<number>(initial?.cliente_id ?? 0);
  const [dataEncomenda, setDataEncomenda] = useState(initial?.data_encomenda ?? new Date().toISOString().slice(0, 10));
  const [dataEntrega, setDataEntrega] = useState(initial?.data_entrega ?? '');
  const [observacao, setObservacao] = useState(initial?.observacao ?? '');
  const [pagamentos, setPagamentos] = useState<EncomendaPagamento[]>(initial?.pagamentos ?? []);
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);

  const [itens, setItens] = useState<EncomendaItem[]>(initial?.itens ?? []);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [customizandoIdx, setCustomizandoIdx] = useState<number | null>(null);

  const total = itens.reduce((acc, item) => acc + item.valor_total, 0);
  const totalPago = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0);

  const confirmarSelecao = (novos: ProdutoSelecionado[]) => {
    setItens(novos as EncomendaItem[]);
    setSeletorAberto(false);
  };

  const removeItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const confirmarCustomizacao = (item: ItemCustomizavel) => {
    if (customizandoIdx === null) return;
    setItens((prev) => prev.map((it, i) => (i === customizandoIdx ? (item as EncomendaItem) : it)));
    setCustomizandoIdx(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) return;

    // Use o primeiro pagamento como forma_pagamento principal (compatibilidade)
    const primeiroPagamento = pagamentos[0];

    onSubmit({
      id: initial?.id ?? initial?.codigo,
      cliente_id: clienteId,
      data_encomenda: dataEncomenda,
      data_entrega: dataEntrega,
      observacao,
      valor_total: total,
      forma_pagamento_id: primeiroPagamento?.forma_pagamento_id ?? undefined,
      bandeira_cartao_id: primeiroPagamento?.bandeira_cartao_id ?? undefined,
      bandeira_cartao_nome: primeiroPagamento?.bandeira_cartao_nome ?? undefined,
      troco_para: primeiroPagamento?.troco_para ?? undefined,
      pagamentos,
      itens,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <label className="label-field">Cliente *</label>
          <RegistroSelect<number>
            value={clienteId || null}
            onChange={setClienteId}
            options={clientes.map((c) => ({ value: (c.id ?? c.codigo)!, label: c.nome }))}
            title="Selecionar Cliente"
          />
        </div>
        <div className="space-y-1.5">
          <label className="label-field">Pagamento</label>
          <button
            type="button"
            onClick={() => setModalPagamentoAberto(true)}
            className="w-full flex items-center justify-between input-field text-left"
          >
            <span className="flex items-center gap-2">
              <CreditCard size={16} className="text-accent-primary" />
              {pagamentos.length > 0 ? (
                <span className="text-sm">
                  {pagamentos.length === 1
                    ? pagamentos[0].forma_pagamento_nome || 'Pagamento definido'
                    : `${pagamentos.length} pagamentos - ${formatCurrency(totalPago)}`}
                </span>
              ) : (
                <span className="text-sm text-text-tertiary">Clique para definir pagamento</span>
              )}
            </span>
            <span className="text-xs text-text-muted">{totalPago > 0 ? formatCurrency(totalPago) : ''}</span>
          </button>
          {totalPago > 0 && totalPago < total && (
            <p className="text-xs text-accent-red">
              Falta {formatCurrency(total - totalPago)}
            </p>
          )}
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input label="Data da Encomenda *" type="date" value={dataEncomenda} onChange={(e) => setDataEncomenda(e.target.value)} />
          </div>
          <div className="flex-1">
            <Input label="Data de Entrega" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="label-field">Observacao</label>
          <textarea className="input-field min-h-[60px]" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>

      <hr className="border-border-primary" />

      <div className="space-y-1.5">
        <label className="label-field font-semibold">Itens da Encomenda</label>

        <div className="space-y-2">
          <p className="text-xs text-text-tertiary">
            Clique para abrir a seleção de produtos, marque os desejados e confirme. Para adicionar ou alterar quantidades, reabra a seleção.
          </p>
          <Button type="button" variant="secondary" onClick={() => setSeletorAberto(true)}>
            <Plus size={16} /> Selecionar Produtos ({itens.length})
          </Button>
        </div>

        <div className="border border-border-primary rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-primary">
              <tr className="bg-bg-muted">
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Produto</th>
                <th className="text-right px-3 py-2 text-text-secondary font-medium">Quantidade</th>
                <th className="text-right px-3 py-2 text-text-secondary font-medium">Valor Unit.</th>
                <th className="text-right px-3 py-2 text-text-secondary font-medium">Valor Total</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => {
                const produto = produtos.find((p) => (p.id ?? p.codigo) === item.produto_fabricado_id);
                const personalizado = (item.removidos?.length ?? 0) > 0 || (item.adicionais?.length ?? 0) > 0;
                return (
                  <tr key={idx} className="border-t border-border-primary">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{produto?.nome ?? item.produto_venda_nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id ?? item.produto_venda_id}`}</span>
                        {personalizado && (
                          <span className="shrink-0 rounded-full bg-accent-blue/15 text-accent-blue px-2 py-0.5 text-[10px] font-medium">
                            Personalizado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{item.quantidade.toFixed(2).replace('.', ',')}</td>
                    <td className="px-3 py-2 text-right">{formatDecimals(item.valor_unitario, 2)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.valor_total)}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setCustomizandoIdx(idx)}
                          title="Personalizar produto"
                          className="p-1 rounded hover:bg-bg-muted transition-colors"
                        >
                          <SlidersHorizontal size={14} className="text-accent-blue" />
                        </button>
                        <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-bg-muted transition-colors">
                          <Trash2 size={14} className="text-accent-red" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {itens.length === 0 && (
                <tr className="border-t border-border-primary">
                  <td colSpan={5} className="px-3 py-4 text-center text-text-tertiary">Nenhum item adicionado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={itens.length === 0}><Plus size={16} /> Salvar Encomenda</Button>
      </div>

      <ProdutosSelecaoModal
        isOpen={seletorAberto}
        titulo="Selecionar Produtos"
        produtos={produtos}
        produtosVenda={produtosVenda}
        itens={itens}
        onConfirmar={confirmarSelecao}
        onFechar={() => setSeletorAberto(false)}
      />

      <ItemCustomizacaoModal
        isOpen={customizandoIdx !== null}
        item={customizandoIdx !== null ? (itens[customizandoIdx] ?? null) : null}
        produtosVenda={produtosVenda}
        onConfirmar={confirmarCustomizacao}
        onFechar={() => setCustomizandoIdx(null)}
      />

      <PagamentoMultiploModal
        isOpen={modalPagamentoAberto}
        onFechar={() => setModalPagamentoAberto(false)}
        onConfirmar={(pgts) => { setPagamentos(pgts); setModalPagamentoAberto(false); }}
        valorTotal={total}
        formasPagamento={formasPagamento}
        bandeirasCartao={bandeirasCartao}
        pagamentosIniciais={pagamentos}
      />
    </form>
  );
}
