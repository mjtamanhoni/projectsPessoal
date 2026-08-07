import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { ReceitaIngrediente, ProdutoFabricado, Insumo } from '@/types';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

const DP = 6;
const DP_DIV = Math.pow(10, DP);

const formatQtyInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const amount = parseInt(digits, 10) / DP_DIV;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: DP,
    maximumFractionDigits: DP,
  }).format(amount);
};

const parseQtyInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return NaN;
  return parseInt(digits, 10) / DP_DIV;
};

const receitaIngredienteSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_fabricado_id: z.number().refine((v) => v > 0, 'Produto e obrigatorio'),
  insumo_id: z.number().refine((v) => v > 0, 'Insumo e obrigatorio'),
  quantidade: z.number().refine((v) => v > 0, 'Quantidade deve ser maior que zero'),
});

type ReceitaIngredienteInput = z.infer<typeof receitaIngredienteSchema>;

interface ReceitaIngredienteFormProps {
  onSubmit: (data: ReceitaIngrediente) => void;
  onCancel: () => void;
  initial?: ReceitaIngrediente | null;
}

export function ReceitaIngredienteForm({ onSubmit, onCancel, initial }: ReceitaIngredienteFormProps) {
  const [produtos, setProdutos] = useState<ProdutoFabricado[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [qtyDisplay, setQtyDisplay] = useState(() =>
    initial?.quantidade != null
      ? formatQtyInput(initial.quantidade.toFixed(DP).replace('.', ''))
      : ''
  );

  useEffect(() => {
    api.get<ProdutoFabricado[]>('/produtos-fabricados').then((r) => setProdutos(r.data)).catch(() => {});
    api.get<Insumo[]>('/insumos').then((r) => setInsumos(r.data)).catch(() => {});
  }, []);

  const { handleSubmit, formState: { errors }, control } = useForm<ReceitaIngredienteInput>({
    resolver: zodResolver(receitaIngredienteSchema),
    defaultValues: initial ? {
      produto_fabricado_id: initial.produto_fabricado_id,
      insumo_id: initial.insumo_id,
      quantidade: initial.quantidade,
    } : {
      produto_fabricado_id: undefined as unknown as number,
      insumo_id: undefined as unknown as number,
      quantidade: undefined as unknown as number,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="produto_fabricado_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Produto Fabricado *</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={produtos.map((p) => ({ value: (p.id ?? p.codigo)!, label: p.nome }))}
              title="Selecionar Produto Fabricado"
            />
            {errors.produto_fabricado_id && (
              <p className="text-xs text-accent-red mt-1">{errors.produto_fabricado_id.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="insumo_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Insumo *</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={insumos.map((i) => ({ value: (i.id ?? i.codigo)!, label: i.nome, sub: i.unidade_medida || undefined }))}
              title="Selecionar Insumo"
            />
            {errors.insumo_id && (
              <p className="text-xs text-accent-red mt-1">{errors.insumo_id.message}</p>
            )}
          </div>
        )}
      />
      <Controller
        name="quantidade"
        control={control}
        render={({ field: { onChange, onBlur, ...field } }) => (
          <Input
            label="Quantidade *"
            type="text"
            inputMode="decimal"
            error={errors.quantidade?.message}
            {...field}
            value={qtyDisplay}
            onChange={(e) => {
              setQtyDisplay(formatQtyInput(e.target.value));
              onChange(parseQtyInput(e.target.value));
            }}
            onBlur={(e) => {
              const parsed = parseQtyInput(e.target.value);
              if (Number.isFinite(parsed)) {
                onChange(parsed);
              }
              onBlur();
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
