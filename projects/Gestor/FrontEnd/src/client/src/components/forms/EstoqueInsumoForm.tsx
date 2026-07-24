import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { EstoqueInsumo, Insumo } from '@/types';
import { useState } from 'react';
import { getDecimalPlaces } from '@/lib/settings';

const estoqueInsumoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  insumo_id: z.number().int().positive('Insumo e obrigatorio'),
  quantidade: z.number().refine((v) => v >= 0, 'Quantidade nao pode ser negativa'),
  data_atualizacao: z.string().min(1, 'Data e obrigatoria'),
  observacao: z.string().max(500).optional().or(z.literal('')),
});

type EstoqueInsumoInput = z.infer<typeof estoqueInsumoSchema>;

interface EstoqueInsumoFormProps {
  onSubmit: (data: EstoqueInsumo) => void;
  onCancel: () => void;
  initial?: EstoqueInsumo | null;
  insumos: Insumo[];
}

export function EstoqueInsumoForm({ onSubmit, onCancel, initial, insumos }: EstoqueInsumoFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<EstoqueInsumoInput>({
    resolver: zodResolver(estoqueInsumoSchema),
    defaultValues: initial ? {
      insumo_id: initial.insumo_id,
      quantidade: Number(initial.quantidade),
      data_atualizacao: initial.data_atualizacao || '',
      observacao: initial.observacao || '',
    } : {
      insumo_id: undefined as unknown as number,
      quantidade: undefined as unknown as number,
      data_atualizacao: new Date().toISOString().split('T')[0],
      observacao: '',
    },
  });

  const dp = getDecimalPlaces();

  const [qtyRaw, setQtyRaw] = useState(() =>
    initial?.quantidade != null ? Number(initial.quantidade).toFixed(dp).replace('.', ',') : ''
  );

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
              const raw = e.target.value.replace(/[^0-9,\.\-]/g, '');
              setQtyRaw(raw);
              const num = raw === '' ? 0 : parseFloat(raw.replace(',', '.'));
              if (!isNaN(num)) {
                field.onChange(num);
              }
            }}
            onBlur={() => {
              if (!qtyRaw) { field.onChange(undefined as unknown as number); return; }
              const num = parseFloat(qtyRaw.replace(',', '.'));
              if (!isNaN(num)) {
                field.onChange(num);
                setQtyRaw(Number(num).toFixed(dp).replace('.', ','));
              }
            }}
          />
        )}
      />
      <Controller
        name="data_atualizacao"
        control={control}
        render={({ field }) => (
          <Input label="Data da Atualizacao *" type="date" error={errors.data_atualizacao?.message} {...field} />
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
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
