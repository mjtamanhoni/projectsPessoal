import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { Insumo } from '@/types';


const insumoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  unidade_medida: z.string().min(1, 'Unidade de medida e obrigatoria'),
  custo_medio: z.union([z.number().min(0), z.literal(''), z.undefined()]).optional(),
  ativo: z.boolean().optional(),
});

type InsumoInput = z.infer<typeof insumoSchema>;

const UNIDADES_MEDIDA = [
  { value: 'kg', label: 'kg' },
  { value: 'L', label: 'L' },
  { value: 'un', label: 'un' },
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
];

interface InsumoFormProps {
  onSubmit: (data: Insumo) => void;
  onCancel: () => void;
  initial?: Insumo | null;
}

export function InsumoForm({ onSubmit, onCancel, initial }: InsumoFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<InsumoInput>({
    resolver: zodResolver(insumoSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      unidade_medida: initial.unidade_medida || '',
      custo_medio: initial.custo_medio ?? undefined,
      ativo: initial.ativo ?? true,
    } : {
      nome: '',
      unidade_medida: '',
      custo_medio: undefined,
      ativo: true,
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as Insumo))} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} {...field} />
        )}
      />
      <Controller
        name="unidade_medida"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Unidade de Medida *</label>
            <select className="input-field" {...field}>
              <option value="">Selecione...</option>
              {UNIDADES_MEDIDA.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            {errors.unidade_medida && (
              <p className="text-xs text-accent-red mt-1">{errors.unidade_medida.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="custo_medio"
        control={control}
        render={({ field: { onChange, value, ...field } }) => (
          <Input
            label="Custo Medio"
            type="number"
            step="0.000001"
            error={errors.custo_medio?.message}
            {...field}
            value={value == null || (typeof value === 'number' && !Number.isFinite(value)) ? '' : value}
            onChange={(e) => {
              const raw = e.target.value;
              onChange(raw === '' ? '' : Number(raw));
            }}
          />
        )}
      />
      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="rounded border-border-subtle"
            />
            <label htmlFor="ativo" className="text-sm text-text-secondary">Ativo</label>
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
