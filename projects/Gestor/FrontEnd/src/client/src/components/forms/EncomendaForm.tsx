import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus, Trash2 } from 'lucide-react';
import type { Encomenda, EncomendaItem, ProdutoFabricado, Cliente } from '@/types';
import { formatCurrency, formatDecimals } from '@/lib/utils';
import { ProdutosSelecaoModal, type ProdutoSelecionado } from '@/components/forms/ProdutosSelecaoModal';

interface EncomendaFormProps {
  onSubmit: (data: Encomenda) => void;
  onCancel: () => void;
  initial?: Encomenda | null;
  produtos: ProdutoFabricado[];
  clientes: Cliente[];
}

export function EncomendaForm({ onSubmit, onCancel, initial, produtos, clientes }: EncomendaFormProps) {
  const [clienteId, setClienteId] = useState<number>(initial?.cliente_id ?? 0);
  const [dataEncomenda, setDataEncomenda] = useState(initial?.data_encomenda ?? new Date().toISOString().slice(0, 10));
  const [dataEntrega, setDataEntrega] = useState(initial?.data_entrega ?? '');
  const [observacao, setObservacao] = useState(initial?.observacao ?? '');

  const [itens, setItens] = useState<EncomendaItem[]>(initial?.itens ?? []);
  const [seletorAberto, setSeletorAberto] = useState(false);

  const total = itens.reduce((acc, item) => acc + item.valor_total, 0);

  const confirmarSelecao = (novos: ProdutoSelecionado[]) => {
    setItens(novos as EncomendaItem[]);
    setSeletorAberto(false);
  };

  const removeItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) return;
    onSubmit({
      id: initial?.id ?? initial?.codigo,
      cliente_id: clienteId,
      data_encomenda: dataEncomenda,
      data_entrega: dataEntrega,
      observacao,
      valor_total: total,
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
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => {
                const produto = produtos.find((p) => (p.id ?? p.codigo) === item.produto_fabricado_id);
                return (
                  <tr key={idx} className="border-t border-border-primary">
                    <td className="px-3 py-2">{produto?.nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id}`}</td>
                    <td className="px-3 py-2 text-right">{item.quantidade.toFixed(2).replace('.', ',')}</td>
                    <td className="px-3 py-2 text-right">{formatDecimals(item.valor_unitario, 2)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.valor_total)}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-bg-muted transition-colors">
                        <Trash2 size={14} className="text-accent-red" />
                      </button>
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
        itens={itens}
        onConfirmar={confirmarSelecao}
        onFechar={() => setSeletorAberto(false)}
      />
    </form>
  );
}
