import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { VendaProduto, ProdutoFabricado, Cliente } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useState, useCallback } from 'react';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';

const vendaProdutoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  cliente_id: z.number().int().positive('Cliente e obrigatorio'),
  usuario_id: z.number().int().positive(),
  quantidade: z.number().refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  valor_unitario: z.number().refine((v) => v > 0, 'Valor unitario deve ser maior que zero'),
  valor_total: z.number().refine((v) => v > 0, 'Valor total deve ser maior que zero'),
  data_venda: z.string().min(1, 'Data e obrigatoria'),
  observacao: z.string().max(500).optional().or(z.literal('')),
  recebido: z.boolean().optional(),
});

type VendaProdutoInput = z.infer<typeof vendaProdutoSchema>;

interface VendaProdutoFormProps {
  onSubmit: (data: VendaProduto) => void;
  onCancel: () => void;
  initial?: VendaProduto | null;
  produtos: ProdutoFabricado[];
  clientes: Cliente[];
}

export function VendaProdutoForm({ onSubmit, onCancel, initial, produtos, clientes }: VendaProdutoFormProps) {
  const { user } = useAuth();
  const { handleSubmit, formState: { errors }, control, setValue, watch } = useForm<VendaProdutoInput>({
    resolver: zodResolver(vendaProdutoSchema),
    defaultValues: initial ? {
      produto_fabricado_id: initial.produto_fabricado_id || undefined as unknown as number,
      cliente_id: initial.cliente_id || undefined as unknown as number,
      usuario_id: initial.usuario_id || undefined as unknown as number,
      quantidade: Number(initial.quantidade) || undefined as unknown as number,
      valor_unitario: Number(initial.valor_unitario) || undefined as unknown as number,
      valor_total: Number(initial.valor_total) || undefined as unknown as number,
      data_venda: initial.data_venda || '',
      observacao: initial.observacao || '',
      recebido: initial.recebido ?? false,
    } : {
      produto_fabricado_id: undefined as unknown as number,
      cliente_id: undefined as unknown as number,
      usuario_id: user?.id || undefined as unknown as number,
      quantidade: undefined as unknown as number,
      valor_unitario: undefined as unknown as number,
      valor_total: undefined as unknown as number,
      data_venda: new Date().toISOString().slice(0, 10),
      observacao: '',
      recebido: true,
    },
  });

  const quantidade = watch('quantidade');
  const valor_unitario = watch('valor_unitario');

  const [vuRaw, setVuRaw] = useState(() =>
    initial?.valor_unitario != null ? formatCurrencyInput(Number(initial.valor_unitario).toFixed(2)) : ''
  );
  const [vtRaw, setVtRaw] = useState(() =>
    initial?.valor_total != null ? formatCurrencyInput(Number(initial.valor_total).toFixed(2)) : ''
  );

  const calcValorTotal = useCallback((qty: number, unitVal: number) => {
    if (qty > 0 && unitVal > 0) {
      const total = qty * unitVal;
      setValue('valor_total', parseFloat(total.toFixed(2)));
      setVtRaw(formatCurrencyInput(total.toFixed(2)));
    } else {
      setValue('valor_total', undefined as unknown as number);
      setVtRaw('');
    }
  }, [setValue]);

  const onFormSubmit = (data: VendaProdutoInput) => {
    onSubmit(data as unknown as VendaProduto);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <Controller
        name="produto_fabricado_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Produto *</label>
            <select className="input-field" value={field.value || ''} onChange={(e) => field.onChange(Number(e.target.value))}>
              <option value="">Selecione...</option>
              {produtos.map((p) => <option key={p.id ?? p.codigo} value={p.id ?? p.codigo}>{p.nome}</option>)}
            </select>
            {errors.produto_fabricado_id && (
              <p className="text-xs text-accent-red mt-1">{errors.produto_fabricado_id.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="cliente_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Cliente *</label>
            <select className="input-field" value={field.value || ''} onChange={(e) => field.onChange(Number(e.target.value))}>
              <option value="">Selecione...</option>
              {clientes.map((c) => <option key={c.id ?? c.codigo} value={c.id ?? c.codigo}>{c.nome}</option>)}
            </select>
            {errors.cliente_id && (
              <p className="text-xs text-accent-red mt-1">{errors.cliente_id.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="quantidade"
        control={control}
        render={({ field }) => (
          <Input
            label="Quantidade *"
            type="number"
            step="any"
            error={errors.quantidade?.message}
            {...field}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              field.onChange(val);
              const uVal = typeof valor_unitario === 'number' ? valor_unitario : parseCurrencyInput(vuRaw);
              calcValorTotal(val, isNaN(uVal) ? 0 : uVal);
            }}
          />
        )}
      />
      <Controller
        name="valor_unitario"
        control={control}
        render={({ field }) => (
          <Input
            label="Valor Unitario *"
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            error={errors.valor_unitario?.message}
            value={vuRaw}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              setVuRaw(formatted);
              const num = parseCurrencyInput(formatted);
              if (num > 0) {
                field.onChange(num);
                const qty = typeof quantidade === 'number' ? quantidade : 0;
                calcValorTotal(qty, num);
              }
            }}
            onBlur={() => {
              if (!vuRaw) { field.onChange(undefined as unknown as number); return; }
              const num = parseCurrencyInput(vuRaw);
              if (num > 0) {
                field.onChange(num);
                setVuRaw(formatCurrencyInput(String(Math.round(num * 100))));
              }
            }}
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
            placeholder="0,00"
            error={errors.valor_total?.message}
            value={vtRaw}
            disabled
          />
        )}
      />
      <Controller
        name="data_venda"
        control={control}
        render={({ field }) => (
          <Input label="Data da Venda *" type="date" error={errors.data_venda?.message} {...field} />
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
        name="recebido"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recebido"
              checked={field.value ?? false}
              onChange={(e) => field.onChange(e.target.checked)}
              className="rounded border-border-subtle"
            />
            <label htmlFor="recebido" className="text-sm text-text-secondary">Venda já recebida?</label>
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