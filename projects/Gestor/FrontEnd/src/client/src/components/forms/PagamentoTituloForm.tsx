import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import type { TituloPagar } from '@/types';

export interface PagamentoTituloFormData {
  dataPagamento: string;
  valorPago: number;
  formaPagamento?: string;
  observacao?: string;
}

interface PagamentoTituloFormProps {
  titulo: TituloPagar;
  onSubmit: (data: PagamentoTituloFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface FormValues {
  dataPagamento: string;
  valorPago: string;
  formaPagamento: string;
  observacao: string;
}

function hoje(): string {
  return new Date().toISOString().split('T')[0];
}

export function PagamentoTituloForm({ titulo, onSubmit, onCancel, loading = false }: PagamentoTituloFormProps) {
  const saldo = Number(titulo.saldoDevedor ?? 0);
  const { handleSubmit, formState: { errors }, control } = useForm<FormValues>({
    defaultValues: {
      dataPagamento: hoje(),
      valorPago: saldo > 0 ? formatCurrencyInput(saldo.toFixed(2)) : '',
      formaPagamento: '',
      observacao: '',
    },
  });

  const handleFormSubmit = (data: FormValues) => {
    onSubmit({
      dataPagamento: data.dataPagamento,
      valorPago: parseCurrencyInput(data.valorPago),
      formaPagamento: data.formaPagamento.trim() || undefined,
      observacao: data.observacao.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="rounded-lg border border-border-primary bg-background-secondary p-3 space-y-1">
        <p className="text-sm font-medium text-text-primary">{titulo.credor}</p>
        <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary">
          <span>Total: <strong className="text-text-primary">{formatCurrency(Number(titulo.valorTotal))}</strong></span>
          <span>Pago: <strong className="text-text-primary">{formatCurrency(Number(titulo.totalPago ?? 0))}</strong></span>
          <span>Saldo: <strong className="text-accent-primary">{formatCurrency(saldo)}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="dataPagamento"
          control={control}
          rules={{ required: 'Data de pagamento é obrigatória' }}
          render={({ field }) => (
            <Input label="Data do Pagamento *" type="date" error={errors.dataPagamento?.message} {...field} />
          )}
        />
        <Controller
          name="valorPago"
          control={control}
          rules={{
            required: 'Valor é obrigatório',
            validate: (value) => {
              const valor = parseCurrencyInput(value);
              if (valor <= 0) return 'Valor deve ser maior que zero';
              if (valor > saldo + 0.005) {
                return `Valor não pode ser maior que o saldo (${formatCurrency(saldo)})`;
              }
              return true;
            },
          }}
          render={({ field }) => (
            <Input
              label="Valor Pago *"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              error={errors.valorPago?.message}
              {...field}
              onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
              onBlur={() => {
                if (field.value && !field.value.includes(',')) field.onChange(field.value + ',00');
              }}
            />
          )}
        />
      </div>

      <Controller
        name="formaPagamento"
        control={control}
        render={({ field }) => (
          <Input label="Forma de Pagamento" placeholder="PIX, boleto, dinheiro..." {...field} />
        )}
      />

      <Controller
        name="observacao"
        control={control}
        render={({ field }) => (
          <Input label="Observação" placeholder="Opcional" {...field} />
        )}
      />

      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Aguarde...' : 'Registrar Pagamento'}
        </Button>
      </div>
    </form>
  );
}
