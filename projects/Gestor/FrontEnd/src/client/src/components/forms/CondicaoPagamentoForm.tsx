import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import type { CondicaoPagamento } from '@/types';

const condicaoPagamentoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  descricao: z.string().min(1, 'Descricao e obrigatoria').max(100),
  qtd_parcelas: z.number().int().positive('Quantidade de parcelas e obrigatoria'),
  dias_primeiro_vencimento: z.number().int().min(0).optional(),
  dias_intervalo: z.number().int().min(0).optional(),
  status: z.number().int().min(0).max(1).optional(),
  parcelamento_fixo: z.number().int().min(0).max(1).optional(),
  dia_vencimento_fixo: z.number().int().min(1).max(31).nullable().optional(),
  a_vista: z.number().int().min(0).max(1).optional(),
});

type CondicaoPagamentoFormData = z.infer<typeof condicaoPagamentoSchema>;

interface CondicaoPagamentoFormProps {
  onSubmit: (data: CondicaoPagamentoFormData) => Promise<void>;
  onCancel: () => void;
  initial?: CondicaoPagamento | null;
}

export function CondicaoPagamentoForm({ onSubmit, onCancel, initial }: CondicaoPagamentoFormProps) {
  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<CondicaoPagamentoFormData>({
    resolver: zodResolver(condicaoPagamentoSchema),
    defaultValues: initial ?? {
      descricao: '',
      qtd_parcelas: 1,
      dias_primeiro_vencimento: 0,
      dias_intervalo: 30,
      status: 1,
      parcelamento_fixo: 0,
      dia_vencimento_fixo: null,
      a_vista: 0,
    },
  });

  const parcelamentoFixo = watch('parcelamento_fixo');
  const aVista = watch('a_vista');

  const handleAVistaChange = (checked: boolean) => {
    setValue('a_vista', checked ? 1 : 0);
    if (checked) {
      setValue('qtd_parcelas', 1);
      setValue('dias_primeiro_vencimento', 0);
      setValue('dias_intervalo', 0);
      setValue('parcelamento_fixo', 0);
      setValue('dia_vencimento_fixo', null);
    }
  };

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
        name="a_vista"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="a_vista"
              checked={(field.value ?? 0) === 1}
              onChange={(e) => handleAVistaChange(e.target.checked)}
              className="rounded border-border-subtle"
            />
            <label htmlFor="a_vista" className="text-sm text-text-secondary font-medium">
              A Vista (pagamento no proprio dia, sem parcelamento)
            </label>
          </div>
        )}
      />
      <div className="grid grid-cols-3 gap-4">
        <Controller
          name="qtd_parcelas"
          control={control}
          render={({ field }) => (
            <Input
              label="Qtd. Parcelas *"
              type="number"
              error={errors.qtd_parcelas?.message}
              {...field}
              disabled={aVista === 1}
              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
            />
          )}
        />
        <Controller
          name="dias_primeiro_vencimento"
          control={control}
          render={({ field }) => (
            <Input
              label="1o. Vencimento (dias)"
              type="number"
              error={errors.dias_primeiro_vencimento?.message}
              {...field}
              disabled={aVista === 1}
              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
            />
          )}
        />
        <Controller
          name="dias_intervalo"
          control={control}
          render={({ field }) => (
            <Input
              label="Intervalo (dias)"
              type="number"
              error={errors.dias_intervalo?.message}
              {...field}
              disabled={aVista === 1}
              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 30)}
            />
          )}
        />
      </div>
      <Controller
        name="parcelamento_fixo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="parcelamento_fixo"
              checked={(field.value ?? 0) === 1}
              onChange={(e) => field.onChange(e.target.checked ? 1 : 0)}
              disabled={aVista === 1}
              className="rounded border-border-subtle"
            />
            <label htmlFor="parcelamento_fixo" className={`text-sm ${aVista === 1 ? 'text-text-muted' : 'text-text-secondary'}`}>
              Parcelamento fixo (dia de vencimento fixo)
            </label>
          </div>
        )}
      />
      {parcelamentoFixo === 1 && aVista !== 1 && (
        <Controller
          name="dia_vencimento_fixo"
          control={control}
          render={({ field }) => (
            <Input
              label="Dia vencimento (1-31)"
              type="number"
              error={errors.dia_vencimento_fixo?.message}
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(parseInt(e.target.value, 10) || null)}
            />
          )}
        />
      )}
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
