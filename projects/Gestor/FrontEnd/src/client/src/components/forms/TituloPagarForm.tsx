import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import type { TituloPagar } from '@/types';

export interface TituloPagarFormData {
  credor: string;
  descricao?: string;
  numeroDocumento?: string;
  valorTotal: number;
  dataEmissao: string;
  dataVencimento: string;
}

interface TituloPagarFormProps {
  onSubmit: (data: TituloPagarFormData) => void;
  onCancel: () => void;
  initial?: TituloPagar | null;
  loading?: boolean;
}

interface FormValues {
  credor: string;
  descricao: string;
  numeroDocumento: string;
  valorTotal: string;
  dataEmissao: string;
  dataVencimento: string;
}

function hoje(): string {
  return new Date().toISOString().split('T')[0];
}

export function TituloPagarForm({ onSubmit, onCancel, initial, loading = false }: TituloPagarFormProps) {
  const { handleSubmit, formState: { errors }, control, getValues } = useForm<FormValues>({
    defaultValues: {
      credor: initial?.credor || '',
      descricao: initial?.descricao || '',
      numeroDocumento: initial?.numeroDocumento || '',
      valorTotal: initial?.valorTotal ? formatCurrencyInput(Number(initial.valorTotal).toFixed(2)) : '',
      dataEmissao: initial?.dataEmissao || hoje(),
      dataVencimento: initial?.dataVencimento || '',
    },
  });

  const handleFormSubmit = (data: FormValues) => {
    onSubmit({
      credor: data.credor.trim(),
      descricao: data.descricao.trim() || undefined,
      numeroDocumento: data.numeroDocumento.trim() || undefined,
      valorTotal: parseCurrencyInput(data.valorTotal),
      dataEmissao: data.dataEmissao,
      dataVencimento: data.dataVencimento,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Controller
        name="credor"
        control={control}
        rules={{ required: 'Credor é obrigatório' }}
        render={({ field }) => (
          <Input label="Credor *" placeholder="Nome do credor" error={errors.credor?.message} {...field} />
        )}
      />

      <Controller
        name="descricao"
        control={control}
        render={({ field }) => (
          <Input label="Descrição" placeholder="Descrição do título" {...field} />
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="numeroDocumento"
          control={control}
          render={({ field }) => (
            <Input label="Nº Documento" placeholder="Nota, boleto, etc." {...field} />
          )}
        />
        <Controller
          name="valorTotal"
          control={control}
          rules={{
            required: 'Valor é obrigatório',
            validate: (value) => parseCurrencyInput(value) > 0 || 'Valor deve ser maior que zero',
          }}
          render={({ field }) => (
            <Input
              label="Valor Total *"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              error={errors.valorTotal?.message}
              {...field}
              onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
              onBlur={() => {
                if (field.value && !field.value.includes(',')) field.onChange(field.value + ',00');
              }}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="dataEmissao"
          control={control}
          rules={{ required: 'Data de emissão é obrigatória' }}
          render={({ field }) => (
            <Input label="Data de Emissão *" type="date" error={errors.dataEmissao?.message} {...field} />
          )}
        />
        <Controller
          name="dataVencimento"
          control={control}
          rules={{
            required: 'Data de vencimento é obrigatória',
            validate: (value) => {
              const emissao = getValues('dataEmissao');
              if (!emissao || !value) return true;
              return value >= emissao || 'Vencimento deve ser igual ou posterior à emissão';
            },
          }}
          render={({ field }) => (
            <Input label="Data de Vencimento *" type="date" error={errors.dataVencimento?.message} {...field} />
          )}
        />
      </div>

      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          <Plus size={16} /> {loading ? 'Aguarde...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
