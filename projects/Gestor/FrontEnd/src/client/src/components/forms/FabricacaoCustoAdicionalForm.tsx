import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { FabricacaoCustoAdicional, CustoAdicionalTipo } from '@/types';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';

const fabricacaoCustoAdicionalSchema = z.object({
  codigo: z.number().int().positive().optional(),
  custo_adicional_tipo_id: z.number().refine((v) => v > 0, 'Tipo de custo e obrigatorio'),
  valor: z.number().refine((v) => v > 0, 'Valor deve ser maior que zero'),
});

type FabricacaoCustoAdicionalInput = z.infer<typeof fabricacaoCustoAdicionalSchema>;

interface FabricacaoCustoAdicionalFormProps {
  onSubmit: (data: FabricacaoCustoAdicional) => void;
  onCancel: () => void;
  initial?: FabricacaoCustoAdicional | null;
  fabricacaoId: number;
}

export function FabricacaoCustoAdicionalForm({ onSubmit, onCancel, initial, fabricacaoId }: FabricacaoCustoAdicionalFormProps) {
  const [tiposCusto, setTiposCusto] = useState<CustoAdicionalTipo[]>([]);

  useEffect(() => {
    api.get<CustoAdicionalTipo[]>('/custos-adicionais-tipo').then((r) => setTiposCusto(r.data.filter((t) => t.ativo !== false))).catch(() => {});
  }, []);

  const { handleSubmit, formState: { errors }, control } = useForm<FabricacaoCustoAdicionalInput>({
    resolver: zodResolver(fabricacaoCustoAdicionalSchema),
    defaultValues: initial ? {
      custo_adicional_tipo_id: initial.custo_adicional_tipo_id,
      valor: initial.valor,
    } : {
      custo_adicional_tipo_id: undefined as unknown as number,
      valor: undefined as unknown as number,
    },
  });

  const handleFormSubmit = (data: FabricacaoCustoAdicionalInput) => {
    onSubmit({ ...data, fabricacao_id: fabricacaoId } as FabricacaoCustoAdicional);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Controller
        name="custo_adicional_tipo_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Tipo de Custo *</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={tiposCusto.map((t) => ({ value: (t.id ?? t.codigo)!, label: t.nome }))}
              title="Selecionar Tipo de Custo"
            />
            {errors.custo_adicional_tipo_id && (
              <p className="text-xs text-accent-red mt-1">{errors.custo_adicional_tipo_id.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="valor"
        control={control}
        render={({ field }) => (
          <Input
            label="Valor (R$) *"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.valor?.message}
            value={field.value ? formatCurrencyInput(Number(field.value).toFixed(2)) : ''}
            onChange={(e) => {
              const parsed = parseCurrencyInput(e.target.value);
              field.onChange(parsed);
            }}
          />
        )}
      />
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
