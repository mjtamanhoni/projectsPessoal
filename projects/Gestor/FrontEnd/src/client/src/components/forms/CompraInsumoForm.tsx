import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus, Trash2 } from 'lucide-react';
import type { CompraInsumo, CompraInsumoItem, Insumo, Fornecedor, Marca } from '@/types';
import { formatCurrency, formatCurrencyInput, formatQuantityInput, formatDecimals, parseCurrencyInput } from '@/lib/utils';
import { getDecimalPlaces } from '@/lib/settings';

interface CompraInsumoFormProps {
  onSubmit: (data: CompraInsumo) => void;
  onCancel: () => void;
  initial?: CompraInsumo | null;
  insumos: Insumo[];
  fornecedores: Fornecedor[];
  marcas: Marca[];
}

export function CompraInsumoForm({ onSubmit, onCancel, initial, insumos, fornecedores, marcas }: CompraInsumoFormProps) {
  const [fornecedorId, setFornecedorId] = useState<number>(initial?.fornecedor_id ?? 0);
  const [dataCompra, setDataCompra] = useState(initial?.data_compra ?? new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState(initial?.observacao ?? '');
  const [pago, setPago] = useState(initial?.pago ?? true);

  const [itens, setItens] = useState<CompraInsumoItem[]>(initial?.itens ?? []);
  const [selectedInsumo, setSelectedInsumo] = useState<number | ''>('');
  const qtdRef = useRef<HTMLInputElement>(null);
  const [itemQtd, setItemQtd] = useState('');
  const [itemTotalRaw, setItemTotalRaw] = useState('');

  const dp = getDecimalPlaces();
  const total = itens.reduce((acc, item) => acc + item.valor_total, 0);
  const qtdNum = itemQtd.replace(/\D/g, '');
  const qtdParsed = qtdNum ? parseInt(qtdNum, 10) / 10000 : 0;
  const totalParsed = parseCurrencyInput(itemTotalRaw);
  const unitarioPreview = qtdParsed > 0 && totalParsed > 0 ? formatDecimals(totalParsed / qtdParsed, 4) : '';

  const addItem = () => {
    const insumoId = typeof selectedInsumo === 'number' ? selectedInsumo : 0;
    if (!insumoId) return;
    const qtd = qtdParsed;
    const vrTotal = totalParsed;
    if (qtd <= 0 || vrTotal <= 0) return;
    const finalVrUnit = vrTotal / qtd;
    setItens([...itens, { insumo_id: insumoId, quantidade: qtd, valor_unitario: finalVrUnit, valor_total: vrTotal }]);
    setSelectedInsumo('');
    setItemQtd('');
    setItemTotalRaw('');
    qtdRef.current?.focus();
  };

  const removeItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) return;
    onSubmit({
      id: initial?.id ?? initial?.codigo,
      fornecedor_id: fornecedorId || undefined,
      data_compra: dataCompra,
      observacao,
      pago,
      valor_total: total,
      itens,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <label className="label-field">Fornecedor</label>
          <RegistroSelect<number>
            value={fornecedorId || null}
            onChange={setFornecedorId}
            options={fornecedores.map((f) => ({ value: (f.id ?? f.codigo)!, label: f.nome }))}
            title="Selecionar Fornecedor"
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input label="Data da Compra *" type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
          </div>
          <div className="pb-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pago"
                checked={pago}
                onChange={(e) => setPago(e.target.checked)}
                className="rounded border-border-subtle"
              />
              <label htmlFor="pago" className="text-sm text-text-secondary whitespace-nowrap">Compra já foi paga?</label>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="label-field">Observacao</label>
          <textarea className="input-field min-h-[60px]" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>

      <hr className="border-border-primary" />

      <div className="space-y-1.5">
        <label className="label-field font-semibold">Itens da Compra</label>

        <div className="space-y-2">
          <div className="space-y-1">
            <label className="label-field text-xs">Insumo</label>
            <RegistroSelect<number>
              value={typeof selectedInsumo === 'number' ? selectedInsumo : null}
              onChange={(v) => {
                setSelectedInsumo(v);
                qtdRef.current?.focus();
              }}
              options={insumos.map((i) => {
                const marcaNome = i.marca_nome || marcas.find((m) => (m.id ?? m.codigo) === i.id_marca)?.nome;
                return { value: (i.id ?? i.codigo)!, label: i.nome, sub: marcaNome || undefined };
              })}
              title="Selecionar Insumo"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="w-32">
              <label className="label-field text-xs">Quantidade</label>
              <input
                ref={qtdRef}
                type="text"
                inputMode="decimal"
                className="input-field text-sm"
                placeholder="0,0000"
                value={itemQtd}
                onChange={(e) => setItemQtd(formatQuantityInput(e.target.value))}
              />
            </div>
            <div className="w-36">
              <label className="label-field text-xs">Valor Total</label>
              <input
                type="text"
                inputMode="decimal"
                className="input-field text-sm"
                placeholder="0,00"
                value={itemTotalRaw}
                onChange={(e) => setItemTotalRaw(formatCurrencyInput(e.target.value))}
              />
            </div>
            <div className="w-28">
              <label className="label-field text-xs">Valor Unit.</label>
              <input
                type="text"
                className="input-field text-sm bg-bg-muted text-text-secondary"
                value={unitarioPreview}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div>
              <Button type="button" variant="secondary" onClick={addItem}>
                <Plus size={14} /> Adicionar
              </Button>
            </div>
          </div>
        </div>

        <div className="border border-border-primary rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-primary">
              <tr className="bg-bg-muted">
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Insumo</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Marca</th>
                <th className="text-right px-3 py-2 text-text-secondary font-medium">Quantidade</th>
                <th className="text-right px-3 py-2 text-text-secondary font-medium">Valor Unit.</th>
                <th className="text-right px-3 py-2 text-text-secondary font-medium">Valor Total</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => {
                const insumo = insumos.find((i) => (i.id ?? i.codigo) === item.insumo_id);
                const marcaNome = item.marca_nome || insumo?.marca_nome || marcas.find((m) => (m.id ?? m.codigo) === insumo?.id_marca)?.nome || '-';
                return (
                  <tr key={idx} className="border-t border-border-primary">
                    <td className="px-3 py-2">{insumo?.nome ?? `ID ${item.insumo_id}`}</td>
                    <td className="px-3 py-2">{marcaNome}</td>
                    <td className="px-3 py-2 text-right">{item.quantidade.toFixed(4).replace('.', ',')}</td>
                    <td className="px-3 py-2 text-right">{formatDecimals(item.valor_unitario, 4)}</td>
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
                  <td colSpan={6} className="px-3 py-4 text-center text-text-tertiary">Nenhum item adicionado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={itens.length === 0}><Plus size={16} /> Salvar Compra</Button>
      </div>
    </form>
  );
}
