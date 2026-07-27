import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import type { UsoConsumo, ProdutoFabricado } from '@/types';

const usoConsumoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().int().positive('Produto e obrigatorio'),
  quantidade: z.number().refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
  data_uso: z.string().min(1, 'Data e obrigatoria'),
  motivo: z.string().max(500).optional().or(z.literal('')),
});

type UsoConsumoFormData = z.infer<typeof usoConsumoSchema>;

interface UsoConsumoFormProps {
  onSubmit: (data: UsoConsumo) => Promise<void>;
  onCancel: () => void;
  initial?: UsoConsumo | null;
}

export function UsoConsumoForm({ onSubmit, onCancel, initial }: UsoConsumoFormProps) {
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<UsoConsumoFormData>({
    resolver: zodResolver(usoConsumoSchema),
    defaultValues: initial ?? { produto_fabricado_id: undefined, quantidade: 0, data_uso: '', motivo: '' },
  });

  useEffect(() => {
    api.get<ProdutoFabricado[]>('/produtos-fabricados').then((r) => setProdutos(r.data)).catch(() => {});
  }, []);

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as UsoConsumo))} className="space-y-4">
      <Controller
        name="produto_fabricado_id"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Produto *</label>
            <select
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              autoFocus
            >
              <option value="">Selecione um produto</option>
              {produtos.map((produto) => (
                <option key={produto.id ?? produto.codigo} value={produto.id ?? produto.codigo}>
                  {produto.nome}
                </option>
              ))}
            </select>
            {errors.produto_fabricado_id && <span className="text-xs text-accent-red">{errors.produto_fabricado_id.message}</span>}
          </div>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="quantidade"
          control={control}
          render={({ field }) => (
            <Input
              label="Quantidade *"
              type="number"
              step="0.001"
              error={errors.quantidade?.message}
              {...field}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
          )}
        />
        <Controller
          name="data_uso"
          control={control}
          render={({ field }) => (
            <Input label="Data do Uso *" type="date" error={errors.data_uso?.message} {...field} />
          )}
        />
      </div>
      <Controller
        name="motivo"
        control={control}
        render={({ field }) => (
          <Input label="Motivo" error={errors.motivo?.message} {...field} value={field.value ?? ''} />
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
