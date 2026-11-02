import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { calcularParcelas, formatCurrency, formatCurrencyInput, formatDate, parseCurrencyInput } from '@/lib/utils';
import type { TituloPagar } from '@/types';

export interface TituloPagarFormData {
  credor: string;
  descricao?: string;
  numeroDocumento?: string;
  valorTotal: number;
  dataEmissao: string;
  dataVencimento: string;
  parcela?: number;
}

interface TituloPagarFormProps {
  onSubmit: (items: TituloPagarFormData[]) => void;
  onCancel: () => void;
  initial?: TituloPagar | null;
  loading?: boolean;
}

type ModoParcelamento = 'dividir' | 'repetir';

interface FormValues {
  credor: string;
  descricao: string;
  numeroDocumento: string;
  valorTotal: string;
  dataEmissao: string;
  dataVencimento: string;
  quantidadeParcelas: number;
  modoParcelamento: ModoParcelamento;
}

function hoje(): string {
  return new Date().toISOString().split('T')[0];
}

function adicionarMeses(dataISO: string, meses: number): string {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  if (!ano || !mes || !dia) return dataISO;
  const alvo = new Date(ano, mes - 1 + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  const diaFinal = Math.min(dia, ultimoDia);
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
}

function montarParcelas(
  valorTotal: number,
  quantidade: number,
  modo: ModoParcelamento,
  dataBase: string
): { valor: number; dataVencimento: string }[] {
  let valores: number[];
  if (quantidade <= 1) {
    valores = [valorTotal];
  } else if (modo === 'repetir') {
    valores = Array.from({ length: quantidade }, () => valorTotal);
  } else {
    const { valorParcela, valorDif } = calcularParcelas(valorTotal, quantidade);
    valores = Array.from({ length: quantidade }, (_, indice) =>
      indice === quantidade - 1 ? Number((valorParcela + valorDif).toFixed(2)) : valorParcela
    );
  }

  let data = dataBase;
  return valores.map((valor, indice) => {
    if (indice > 0) data = adicionarMeses(data, 1);
    return { valor, dataVencimento: data };
  });
}

export function TituloPagarForm({ onSubmit, onCancel, initial, loading = false }: TituloPagarFormProps) {
  const editando = Boolean(initial?.id);
  const { handleSubmit, formState: { errors }, control, getValues, watch } = useForm<FormValues>({
    defaultValues: {
      credor: initial?.credor || '',
      descricao: initial?.descricao || '',
      numeroDocumento: initial?.numeroDocumento || '',
      valorTotal: initial?.valorTotal ? formatCurrencyInput(Number(initial.valorTotal).toFixed(2)) : '',
      dataEmissao: initial?.dataEmissao || hoje(),
      dataVencimento: initial?.dataVencimento || '',
      quantidadeParcelas: 1,
      modoParcelamento: 'dividir',
    },
  });

  const valorTexto = watch('valorTotal');
  const quantidadeTexto = watch('quantidadeParcelas');
  const modoParcelamento = watch('modoParcelamento');
  const dataVencimentoBase = watch('dataVencimento');
  const valorBase = parseCurrencyInput(valorTexto || '');
  const quantidade = Math.max(1, Math.floor(Number(quantidadeTexto) || 1));
  const { valorParcela, valorDif } = calcularParcelas(valorBase, quantidade);
  const valorUltima = Number((valorParcela + valorDif).toFixed(2));
  const parcelasPreview = montarParcelas(valorBase, quantidade, modoParcelamento, dataVencimentoBase);

  const handleFormSubmit = (data: FormValues) => {
    const valorTotal = parseCurrencyInput(data.valorTotal);
    const base = {
      credor: data.credor.trim(),
      descricao: data.descricao.trim() || undefined,
      numeroDocumento: data.numeroDocumento.trim() || undefined,
      dataEmissao: data.dataEmissao,
      dataVencimento: data.dataVencimento,
    };

    if (editando) {
      onSubmit([{ ...base, valorTotal, parcela: initial?.parcela ?? 1 }]);
      return;
    }

    const totalParcelas = Math.max(1, Math.floor(Number(data.quantidadeParcelas) || 1));
    const parcelas = montarParcelas(valorTotal, totalParcelas, data.modoParcelamento, data.dataVencimento);
    onSubmit(
      parcelas.map((parcela, indice) => ({
        ...base,
        valorTotal: parcela.valor,
        dataVencimento: parcela.dataVencimento,
        parcela: indice + 1,
      }))
    );
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

      {editando ? (
        Number(initial?.parcela ?? 1) > 1 && (
          <p className="text-sm text-text-secondary">Este título é a parcela {initial?.parcela}.</p>
        )
      ) : (
        <div className="rounded-lg border border-border-primary p-4 space-y-4">
          <Controller
            name="quantidadeParcelas"
            control={control}
            rules={{ min: { value: 1, message: 'Informe ao menos 1 parcela' } }}
            render={({ field }) => (
              <Input
                label="Quantidade de parcelas"
                type="number"
                min={1}
                max={999}
                step={1}
                error={errors.quantidadeParcelas?.message}
                value={field.value}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
              />
            )}
          />

          {quantidade > 1 && (
            <Controller
              name="modoParcelamento"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label-field">Como gerar as parcelas?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <label
                      className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                        field.value === 'dividir'
                          ? 'border-accent-primary bg-accent-primary/5'
                          : 'border-border-primary hover:bg-background-hover'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                        <input
                          type="radio"
                          checked={field.value === 'dividir'}
                          onChange={() => field.onChange('dividir')}
                          className="text-accent-primary"
                        />
                        Dividir o valor
                      </span>
                      <span className="text-xs text-text-secondary">
                        {quantidade} parcelas de {formatCurrency(valorParcela)}
                        {valorDif > 0 && ` (última de ${formatCurrency(valorUltima)})`}
                      </span>
                    </label>

                    <label
                      className={`flex flex-col gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                        field.value === 'repetir'
                          ? 'border-accent-primary bg-accent-primary/5'
                          : 'border-border-primary hover:bg-background-hover'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                        <input
                          type="radio"
                          checked={field.value === 'repetir'}
                          onChange={() => field.onChange('repetir')}
                          className="text-accent-primary"
                        />
                        Repetir o valor
                      </span>
                      <span className="text-xs text-text-secondary">
                        {quantidade} parcelas de {formatCurrency(valorBase)} (total{' '}
                        {formatCurrency(valorBase * quantidade)})
                      </span>
                    </label>
                  </div>
                </div>
              )}
            />
          )}

          {quantidade > 1 && (
            <div className="rounded-md bg-background-secondary p-3 text-xs text-text-secondary">
              <p className="font-medium text-text-primary mb-1">Vencimentos</p>
              <ul className="space-y-0.5">
                {parcelasPreview.slice(0, 3).map((parcela, indice) => (
                  <li key={indice}>
                    {indice + 1}ª: {formatDate(parcela.dataVencimento)} — {formatCurrency(parcela.valor)}
                  </li>
                ))}
                {quantidade > 3 && <li>...e mais {quantidade - 3} parcelas</li>}
              </ul>
            </div>
          )}
        </div>
      )}

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
