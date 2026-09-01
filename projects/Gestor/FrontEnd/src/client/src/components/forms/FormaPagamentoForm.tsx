import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import type { FormaPagamento } from '@/types';

const formaPagamentoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  descricao: z.string().min(1, 'Descricao e obrigatoria').max(100),
  classificacao: z.string().max(50).optional(),
  status: z.number().int().min(0).max(1).optional(),
});

type FormaPagamentoFormData = z.infer<typeof formaPagamentoSchema>;

const CLASSIFICACOES = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Cartao de Credito' },
  { value: 'CARTAO_DEBITO', label: 'Cartao de Debito' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OUTROS', label: 'Outros' },
];

interface FormaPagamentoFormProps {
  onSubmit: (data: FormaPagamentoFormData) => Promise<void>;
  onCancel: () => void;
  initial?: FormaPagamento | null;
}

export function FormaPagamentoForm({ onSubmit, onCancel, initial }: FormaPagamentoFormProps) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormaPagamentoFormData>({
    resolver: zodResolver(formaPagamentoSchema),
    defaultValues: initial ?? { descricao: '', classificacao: 'OUTROS', status: 1 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="descricao"
        control={control}
        render={({ field }) => (
          <Input label="Descricao *" error={errors.descricao?.message} autoFocus {...field} />
        )}
      />
      <Controller
        name="classificacao"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Classificacao</label>
            <select
              {...field}
              value={field.value ?? 'OUTROS'}
              className="w-full px-3 py-2 bg-background-input border border-border-primary rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              {CLASSIFICACOES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
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
              checked={(field.value ?? 1) === 1}
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
