import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { Fabricacao, ProdutoFabricado } from '@/types';

const fabricacaoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  quantidade_produzida: z.number().positive('Quantidade deve ser maior que zero'),
  data_fabricacao: z.string().min(1, 'Data e obrigatoria'),
  observacao: z.string().max(500).optional().or(z.literal('')),
});

type FabricacaoInput = z.infer<typeof fabricacaoSchema>;

interface FabricacaoFormProps {
  onSubmit: (data: Fabricacao) => void;
  onCancel: () => void;
  initial?: Fabricacao | null;
  produtos: ProdutoFabricado[];
}

export function FabricacaoForm({ onSubmit, onCancel, initial, produtos }: FabricacaoFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<FabricacaoInput>({
    resolver: zodResolver(fabricacaoSchema),
    defaultValues: initial ? {
      produto_fabricado_id: initial.produto_fabricado_id || undefined as unknown as number,
      quantidade_produzida: Number(initial.quantidade_produzida) || undefined as unknown as number,
      data_fabricacao: initial.data_fabricacao || '',
      observacao: initial.observacao || '',
    } : {
      produto_fabricado_id: undefined as unknown as number,
      quantidade_produzida: undefined as unknown as number,
      data_fabricacao: new Date().toISOString().slice(0, 10),
      observacao: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="produto_fabricado_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Produto *</label>
            <RegistroSelect<number>
              value={field.value || null}
              onChange={(v) => field.onChange(v)}
              options={produtos.map((p) => ({ value: (p.id ?? p.codigo)!, label: p.nome }))}
              title="Selecionar Produto"
            />
            {errors.produto_fabricado_id && (
              <p className="text-xs text-accent-red mt-1">{errors.produto_fabricado_id.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="quantidade_produzida"
        control={control}
        render={({ field }) => (
          <Input
            label="Quantidade Produzida *"
            type="number"
            step="any"
            error={errors.quantidade_produzida?.message}
            {...field}
            onChange={(e) => field.onChange(Number(e.target.value))}
          />
        )}
      />
      <Controller
        name="data_fabricacao"
        control={control}
        render={({ field }) => (
          <Input label="Data da Fabricacao *" type="date" error={errors.data_fabricacao?.message} {...field} />
        )}
      />
      <Controller
        name="observacao"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Observacao</label>
            <textarea className="input-field min-h-[80px]" {...field} />
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
