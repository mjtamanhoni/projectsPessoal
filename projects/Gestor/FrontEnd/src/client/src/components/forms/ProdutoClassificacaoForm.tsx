import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import type { ProdutoClassificacao } from '@/types';

const produtoClassificacaoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100),
  status: z.number().int().min(0).max(1).optional(),
});

type ProdutoClassificacaoFormData = z.infer<typeof produtoClassificacaoSchema>;

interface ProdutoClassificacaoFormProps {
  onSubmit: (data: ProdutoClassificacaoFormData) => Promise<void>;
  onCancel: () => void;
  initial?: ProdutoClassificacao | null;
}

export function ProdutoClassificacaoForm({ onSubmit, onCancel, initial }: ProdutoClassificacaoFormProps) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProdutoClassificacaoFormData>({
    resolver: zodResolver(produtoClassificacaoSchema),
    defaultValues: initial ?? { nome: '', status: 1 },
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
        name="status"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="status"
              checked={field.value === 1}
              onChange={(e) => field.onChange(e.target.checked ? 1 : 0)}
              className="rounded border-border-subtle"
            />
            <label htmlFor="status" className="text-sm text-text-secondary">Ativo</label>
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