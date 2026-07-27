import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import type { Marca } from '@/types';

const marcaSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  ativo: z.boolean().optional(),
});

type MarcaFormData = z.infer<typeof marcaSchema>;

interface MarcaFormProps {
  onSubmit: (data: MarcaFormData) => Promise<void>;
  onCancel: () => void;
  initial?: Marca | null;
}

export function MarcaForm({ onSubmit, onCancel, initial }: MarcaFormProps) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<MarcaFormData>({
    resolver: zodResolver(marcaSchema),
    defaultValues: initial ?? { nome: '', ativo: true },
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
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={field.value ?? true}
              onChange={(e) => field.onChange(e.target.checked)}
              className="rounded border-border-subtle"
            />
            <label htmlFor="ativo" className="text-sm text-text-secondary">Ativo</label>
          </div>
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
