import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { CustoAdicionalTipo } from '@/types';

const custoAdicionalTipoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  ativo: z.boolean().optional(),
});

type CustoAdicionalTipoInput = z.infer<typeof custoAdicionalTipoSchema>;

interface CustoAdicionalTipoFormProps {
  onSubmit: (data: CustoAdicionalTipo) => void;
  onCancel: () => void;
  initial?: CustoAdicionalTipo | null;
}

export function CustoAdicionalTipoForm({ onSubmit, onCancel, initial }: CustoAdicionalTipoFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<CustoAdicionalTipoInput>({
    resolver: zodResolver(custoAdicionalTipoSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      ativo: initial.ativo ?? true,
    } : {
      nome: '',
      ativo: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} {...field} />
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
