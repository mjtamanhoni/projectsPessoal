import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyInput, gerarParcelas, type ParcelasConfig } from '@/lib/utils';
import type { ContaPagar } from '@/types';

interface ContaPagarFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initial?: ContaPagar | null;
  fornecedores: { id: number; nome: string }[];
  categorias: { id: number; nome: string }[];
}

interface FormValues {
  descricao: string;
  valor: string;
  dataVencimento: string;
  fornecedorId: string;
  idCategoria: string;
}

export function ContaPagarForm({ onSubmit, onCancel, initial, fornecedores, categorias }: ContaPagarFormProps) {
  const [gerarParcelasAtivado, setGerarParcelasAtivado] = useState(false);
  const [parcelasAberto, setParcelasAberto] = useState(false);
  const [qtdParcelas, setQtdParcelas] = useState(2);
  const [tipoVencimento, setTipoVencimento] = useState<'fixo' | 'intervalo'>('fixo');
  const [tipoParcela, setTipoParcela] = useState<'dividir' | 'mesmo'>('dividir');
  const [intervalo, setIntervalo] = useState(30);

  const { handleSubmit, formState: { errors }, control, watch } = useForm<FormValues>({
    defaultValues: initial ? {
      descricao: initial.descricao || '',
      valor: initial.valor ? formatCurrencyInput(Number(initial.valor).toFixed(2)) : '',
      dataVencimento: initial.dataVencimento || '',
      fornecedorId: initial.fornecedorId?.toString() || '',
      idCategoria: initial.idCategoria?.toString() || '',
    } : {
      descricao: '',
      valor: '',
      dataVencimento: '',
      fornecedorId: '',
      idCategoria: '',
    },
  });

  const watchValor = watch('valor');
  const watchDataVencimento = watch('dataVencimento');

  const handleFormSubmit = (data: FormValues) => {
    const valorTotal = parseCurrencyInput(data.valor);

    const isNewAccount = !initial || (!initial.id && !initial.codigo);
    if (gerarParcelasAtivado && isNewAccount && qtdParcelas > 1 && watchDataVencimento && valorTotal > 0) {
      const config: ParcelasConfig = {
        quantidade: qtdParcelas,
        tipoVencimento,
        tipoParcela,
        intervalo,
      };
      const parcelas = gerarParcelas(data.dataVencimento, valorTotal, config);
      const contas = parcelas.map((p) => ({
        descricao: data.descricao,
        valor: p.valor,
        dataVencimento: p.dataVencimento,
        fornecedorId: data.fornecedorId ? Number(data.fornecedorId) : null,
        idCategoria: data.idCategoria ? Number(data.idCategoria) : null,
        lancamentoOrigemId: initial?.lancamentoOrigemId ?? null,
      }));
      onSubmit(contas);
    } else {
      onSubmit([{
        descricao: data.descricao,
        valor: valorTotal,
        dataVencimento: data.dataVencimento,
        codigo: initial?.id || initial?.codigo || undefined,
        fornecedorId: data.fornecedorId ? Number(data.fornecedorId) : null,
        idCategoria: data.idCategoria ? Number(data.idCategoria) : null,
        lancamentoOrigemId: initial?.lancamentoOrigemId ?? null,
      }]);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Controller
        name="descricao"
        control={control}
        rules={{ required: 'Descrição e obrigatória' }}
        render={({ field }) => (
          <Input label="Descrição *" error={errors.descricao?.message} {...field} />
        )}
      />
      <Controller
        name="valor"
        control={control}
        rules={{ required: 'Valor e obrigatório' }}
        render={({ field }) => (
          <Input 
            label="Valor *" 
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.valor?.message}
            {...field}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              field.onChange(formatted);
            }}
            onBlur={() => {
              if (field.value && !field.value.includes(',')) {
                field.onChange(field.value + ',00');
              }
            }}
          />
        )}
      />
      <Controller
        name="dataVencimento"
        control={control}
        rules={{ required: 'Data e obrigatória' }}
        render={({ field }) => (
          <Input label="Data de Vencimento *" type="date" error={errors.dataVencimento?.message} {...field} />
        )}
      />

      {(!initial || (!initial.id && !initial.codigo)) && (
        <div className="border border-border-primary rounded-lg">
          <button
            type="button"
            onClick={() => setParcelasAberto(!parcelasAberto)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-text-primary hover:bg-background-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={gerarParcelasAtivado}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setGerarParcelasAtivado(e.target.checked);
                  if (e.target.checked) setParcelasAberto(true);
                }}
                className="rounded border-border-primary"
              />
              <span>Gerar Parcelas</span>
            </div>
            {parcelasAberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {parcelasAberto && gerarParcelasAtivado && (
            <div className="px-4 pb-4 space-y-4 border-t border-border-primary pt-3">
              <div>
                <label className="label-field">Quantidade de Parcelas</label>
                <input
                  type="number"
                  min={2}
                  max={999}
                  value={qtdParcelas}
                  onChange={(e) => setQtdParcelas(Math.max(2, parseInt(e.target.value) || 2))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">Tipo de Vencimento</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={tipoVencimento === 'fixo'}
                      onChange={() => setTipoVencimento('fixo')}
                      className="text-accent-primary"
                    />
                    Dia Fixo (mesmo dia do mes)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={tipoVencimento === 'intervalo'}
                      onChange={() => setTipoVencimento('intervalo')}
                      className="text-accent-primary"
                    />
                    Intervalo de Dias
                  </label>
                </div>
              </div>

              {tipoVencimento === 'intervalo' && (
                <div>
                  <label className="label-field">Dias de Intervalo</label>
                  <input
                    type="number"
                    min={1}
                    value={intervalo}
                    onChange={(e) => setIntervalo(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input-field"
                  />
                </div>
              )}

              <div>
                <label className="label-field">Tipo de Parcela</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={tipoParcela === 'dividir'}
                      onChange={() => setTipoParcela('dividir')}
                      className="text-accent-primary"
                    />
                    Dividir Valor Total
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={tipoParcela === 'mesmo'}
                      onChange={() => setTipoParcela('mesmo')}
                      className="text-accent-primary"
                    />
                    Mesmo Valor por Parcela
                  </label>
                </div>
              </div>

              {gerarParcelasAtivado && watchValor && watchDataVencimento && (
                <div className="text-xs text-text-secondary bg-background-secondary p-3 rounded-lg">
                  <p className="font-medium mb-1">Pre-visualizacao: {qtdParcelas} parcelas</p>
                  <ul className="space-y-0.5">
                    {gerarParcelas(
                      watchDataVencimento,
                      parseCurrencyInput(watchValor),
                      { quantidade: qtdParcelas, tipoVencimento, tipoParcela, intervalo }
                    ).slice(0, 3).map((p, i) => (
                      <li key={i}>
                        {i + 1}a: {new Date(p.dataVencimento).toLocaleDateString('pt-BR')} - R$ {p.valor.toFixed(2)}
                      </li>
                    ))}
                    {qtdParcelas > 3 && (
                      <li className="italic">...e mais {qtdParcelas - 3} parcelas</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Controller
        name="fornecedorId"
        control={control}
        rules={{ required: 'Fornecedor e obrigatório' }}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Fornecedor *</label>
            <RegistroSelect<string>
              value={field.value || null}
              onChange={field.onChange}
              options={fornecedores.map((f) => ({ value: String(f.id), label: f.nome }))}
              title="Selecionar Fornecedor"
            />
            {errors.fornecedorId && (
              <p className="text-xs text-accent-red mt-1">{errors.fornecedorId.message}</p>
            )}
          </div>
        )}
      />

      <Controller
        name="idCategoria"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Categoria</label>
            <RegistroSelect<string>
              value={field.value || null}
              onChange={field.onChange}
              options={categorias.map((c) => ({ value: String(c.id), label: c.nome }))}
              title="Selecionar Categoria"
            />
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