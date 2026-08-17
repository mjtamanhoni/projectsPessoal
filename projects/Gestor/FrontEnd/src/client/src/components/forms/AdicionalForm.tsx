import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import type { Adicional } from '@/types';

const adicionalSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  descricao: z.string().max(500).optional(),
  preco: z.number().min(0, 'Preco deve ser maior ou igual a zero'),
  ativo: z.boolean().optional(),
});

type AdicionalInput = z.infer<typeof adicionalSchema>;

interface AdicionalFormProps {
  onSubmit: (data: Adicional) => void;
  onCancel: () => void;
  initial?: Adicional | null;
}

export function AdicionalForm({ onSubmit, onCancel, initial }: AdicionalFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<AdicionalInput>({
    resolver: zodResolver(adicionalSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      descricao: initial.descricao || '',
      preco: initial.preco ?? 0,
      ativo: initial.ativo ?? true,
    } : {
      nome: '',
      descricao: '',
      preco: 0,
      ativo: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} autoFocus {...field} />
        )}
      />
      <Controller
        name="descricao"
        control={control}
        render={({ field }) => (
          <Input label="Descrição" error={errors.descricao?.message} {...field} />
        )}
      />
      <Controller
        name="preco"
        control={control}
        render={({ field }) => (
          <Input
            label="Preço (R$) *"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.preco?.message}
            value={field.value ? formatCurrencyInput(Number(field.value).toFixed(2)) : ''}
            onChange={(e) => {
              const parsed = parseCurrencyInput(e.target.value);
              field.onChange(parsed);
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