import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import api from '@/lib/api';
import type { PerdaInsumo, Insumo } from '@/types';

const perdaInsumoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  insumo_id: z.number().int().positive('Insumo e obrigatorio'),
  quantidade: z.number().refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  data_perda: z.string().min(1, 'Data e obrigatoria'),
  motivo: z.string().max(500).optional().or(z.literal('')),
});

type PerdaInsumoFormData = z.infer<typeof perdaInsumoSchema>;

interface PerdaInsumoFormProps {
  onSubmit: (data: PerdaInsumo) => Promise<void>;
  onCancel: () => void;
  initial?: PerdaInsumo | null;
}

export function PerdaInsumoForm({ onSubmit, onCancel, initial }: PerdaInsumoFormProps) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<PerdaInsumoFormData>({
    resolver: zodResolver(perdaInsumoSchema),
    defaultValues: initial ?? { insumo_id: undefined, quantidade: 0, data_perda: '', motivo: '' },
  });

  useEffect(() => {
    api.get<Insumo[]>('/insumos').then((r) => setInsumos(r.data)).catch(() => {});
  }, []);

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as PerdaInsumo))} className="space-y-4">
      <Controller
        name="insumo_id"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Insumo *</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={insumos.map((insumo) => ({ value: (insumo.id ?? insumo.codigo)!, label: insumo.nome }))}
              title="Selecionar Insumo"
            />
            {errors.insumo_id && <span className="text-xs text-accent-red">{errors.insumo_id.message}</span>}
          </div>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="quantidade"
          control={control}
          render={({ field }) => (
            <Input
              label="Quantidade *"
              type="number"
              step="0.001"
              error={errors.quantidade?.message}
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
          )}
        />
        <Controller
          name="data_perda"
          control={control}
          render={({ field }) => (
            <Input label="Data da Perda *" type="date" error={errors.data_perda?.message} {...field} />
          )}
        />
      </div>
      <Controller
        name="motivo"
        control={control}
        render={({ field }) => (
          <Input label="Motivo" error={errors.motivo?.message} {...field} value={field.value ?? ''} />
        )}
      />
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
