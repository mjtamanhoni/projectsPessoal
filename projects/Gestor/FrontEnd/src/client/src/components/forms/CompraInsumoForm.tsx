import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { CompraInsumo, Insumo, Fornecedor } from '@/types';
import { useState, useCallback } from 'react';
import { formatCurrencyInput, parseCurrencyInput, formatQuantityInput, parseQuantityInput } from '@/lib/utils';
import { getDecimalPlaces } from '@/lib/settings';

const compraInsumoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  insumo_id: z.number().int().positive('Insumo e obrigatório'),
  fornecedor_id: z.number().int().positive().optional().or(z.literal(0)),
  quantidade: z.number().refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  valor_unitario: z.number().refine((v) => v > 0, 'Valor unitário deve ser maior que zero'),
  valor_total: z.number().refine((v) => v > 0, 'Valor total deve ser maior que zero'),
  data_compra: z.string().min(1, 'Data e obrigatória'),
  observacao: z.string().max(500).optional().or(z.literal('')),
  pago: z.boolean().optional(),
});

type CompraInsumoInput = z.infer<typeof compraInsumoSchema>;

interface CompraInsumoFormProps {
  onSubmit: (data: CompraInsumo) => void;
  onCancel: () => void;
  initial?: CompraInsumo | null;
  insumos: Insumo[];
  fornecedores: Fornecedor[];
}

export function CompraInsumoForm({ onSubmit, onCancel, initial, insumos, fornecedores }: CompraInsumoFormProps) {
  const { handleSubmit, formState: { errors }, control, setValue, watch } = useForm<CompraInsumoInput>({
    resolver: zodResolver(compraInsumoSchema),
    defaultValues: initial ? {
      insumo_id: initial.insumo_id,
      fornecedor_id: initial.fornecedor_id ?? 0,
      quantidade: Number(initial.quantidade),
      valor_unitario: Number(initial.valor_unitario),
      valor_total: Number(initial.valor_total),
      data_compra: initial.data_compra || '',
      observacao: initial.observacao || '',
      pago: initial.pago ?? false,
    } : {
      insumo_id: undefined as unknown as number,
      fornecedor_id: 0,
      quantidade: undefined as unknown as number,
      valor_unitario: undefined as unknown as number,
      valor_total: undefined as unknown as number,
      data_compra: new Date().toISOString().slice(0, 10),
      observacao: '',
      pago: true,
    },
  });

  const qty = watch('quantidade');
  const vt = watch('valor_total');

  const dp = getDecimalPlaces();

  const [qtyRaw, setQtyRaw] = useState(() =>
    initial?.quantidade != null ? formatQuantityInput(String(Math.round(Number(initial.quantidade) * 10000)), 4) : ''
  );
  const [vtRaw, setVtRaw] = useState(() =>
    initial?.valor_total != null ? formatCurrencyInput(Number(initial.valor_total).toFixed(2)) : ''
  );

  const recalcularUnitario = useCallback((quantidade: number, valorTotal: number) => {
    if (quantidade > 0 && valorTotal > 0) {
      const unit = valorTotal / quantidade;
      setValue('valor_unitario', parseFloat(unit.toFixed(6)));
    }
  }, [setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="insumo_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Insumo *</label>
            <select className="input-field" value={field.value || ''} onChange={(e) => field.onChange(Number(e.target.value))}>
              <option value="">Selecione...</option>
              {insumos.map((i) => <option key={i.id ?? i.codigo} value={i.id ?? i.codigo}>{i.nome}</option>)}
            </select>
            {errors.insumo_id && (
              <p className="text-xs text-accent-red mt-1">{errors.insumo_id.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="fornecedor_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Fornecedor</label>
            <select className="input-field" value={field.value || 0} onChange={(e) => field.onChange(Number(e.target.value))}>
              <option value={0}>Selecione...</option>
              {fornecedores.map((f) => <option key={f.id ?? f.codigo} value={f.id ?? f.codigo}>{f.nome}</option>)}
            </select>
          </div>
        )}
      />
      <Controller
        name="quantidade"
        control={control}
        render={({ field }) => (
          <Input
            label="Quantidade *"
            type="text"
            inputMode="decimal"
            placeholder={'0,' + '0'.repeat(dp)}
            error={errors.quantidade?.message}
            value={qtyRaw}
            onChange={(e) => {
              const formatted = formatQuantityInput(e.target.value, 4);
              setQtyRaw(formatted);
              const num = parseQuantityInput(formatted, 4);
              if (num > 0) {
                field.onChange(num);
                const total = typeof vt === 'number' && vt > 0 ? vt : 0;
                recalcularUnitario(num, total);
              }
            }}
            onBlur={() => {
              if (!qtyRaw) { field.onChange(undefined as unknown as number); return; }
              const num = parseQuantityInput(qtyRaw, 4);
              if (!isNaN(num) && num > 0) {
                field.onChange(num);
                setQtyRaw(formatQuantityInput(String(Math.round(num * 10000)), 4));
              }
            }}
          />
        )}
      />
      <Controller
        name="valor_unitario"
        control={control}
        render={({ field }) => (
          <Input
            label="Valor Unitário"
            type="text"
            placeholder="0,00"
            error={errors.valor_unitario?.message}
            value={vt != null && qty != null && qty > 0 && vt > 0
              ? formatCurrencyInput(Number(vt / qty).toFixed(2))
              : (initial?.valor_unitario != null ? formatCurrencyInput(Number(initial.valor_unitario).toFixed(2)) : '')}
            disabled
          />
        )}
      />
      <Controller
        name="valor_total"
        control={control}
        render={({ field }) => (
          <Input
            label="Valor Total *"
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            error={errors.valor_total?.message}
            value={vtRaw}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              setVtRaw(formatted);
              const num = parseCurrencyInput(formatted);
              if (num > 0) {
                field.onChange(num);
                const q = typeof qty === 'number' && qty > 0 ? qty : 0;
                recalcularUnitario(q, num);
              }
            }}
            onBlur={() => {
              if (!vtRaw) { field.onChange(undefined as unknown as number); return; }
              const num = parseCurrencyInput(vtRaw);
              if (num > 0) {
                field.onChange(num);
                setVtRaw(formatCurrencyInput(String(Math.round(num * 100))));
              }
            }}
          />
        )}
      />
      <Controller
        name="data_compra"
        control={control}
        render={({ field }) => (
          <Input label="Data da Compra *" type="date" error={errors.data_compra?.message} {...field} />
        )}
      />
      <Controller
        name="observacao"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Observacao</label>
            <textarea className="input-field min-h-[80px]" {...field} />
          </div>
        )}
      />
      <Controller
        name="pago"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pago"
              checked={field.value ?? false}
              onChange={(e) => field.onChange(e.target.checked)}
              className="rounded border-border-subtle"
            />
            <label htmlFor="pago" className="text-sm text-text-secondary">Compra já foi paga?</label>
          </div>
        )}
      />
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}