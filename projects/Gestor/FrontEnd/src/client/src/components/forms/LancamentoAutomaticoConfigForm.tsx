import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { LancamentoAutomaticoConfig, Categoria } from '@/types';

const origens = [
  { value: 'venda_produto', label: 'Venda de Produto Fabricado' },
  { value: 'compra_insumo', label: 'Compra de Insumo' },
  { value: 'servico', label: 'Servico Prestado' },
];

const schema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  tipo_origem: z.string().min(1, 'Tipo de origem e obrigatorio'),
  tipo_lancamento: z.string().min(1, 'Tipo de lancamento e obrigatorio'),
  categoria_id: z.number({ message: 'Categoria e obrigatoria' }).positive('Selecione uma categoria'),
  dias_vencimento: z.number().int().positive('Deve ser positivo').optional(),
  descricao_template: z.string().optional(),
  ativo: z.boolean().optional(),
});

interface Props {
  onSubmit: (data: LancamentoAutomaticoConfig) => void;
  onCancel: () => void;
  initial?: LancamentoAutomaticoConfig | null;
  categoriasPagar: Categoria[];
  categoriasReceber: Categoria[];
}

export function LancamentoAutomaticoConfigForm({ onSubmit, onCancel, initial, categoriasPagar, categoriasReceber }: Props) {
  const { handleSubmit, formState: { errors }, control, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      tipo_origem: initial.tipo_origem || '',
      tipo_lancamento: initial.tipo_lancamento || 'receber',
      categoria_id: initial.categoria_id || 0,
      dias_vencimento: initial.dias_vencimento ?? 30,
      descricao_template: initial.descricao_template || '',
      ativo: initial.ativo ?? true,
    } : {
      tipo_origem: '',
      tipo_lancamento: 'receber',
      categoria_id: 0,
      dias_vencimento: 30,
      descricao_template: '',
      ativo: true,
    },
  });

  const tipoLancamento = watch('tipo_lancamento');
  const categorias = tipoLancamento === 'pagar' ? categoriasPagar : categoriasReceber;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="tipo_origem"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Tipo de Origem *</label>
            <select className="input-field" {...field}>
              <option value="">Selecione...</option>
              {origens.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {errors.tipo_origem && <p className="text-xs text-red-500 mt-0.5">{errors.tipo_origem.message}</p>}
          </div>
        )}
      />
      <Controller
        name="tipo_lancamento"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Tipo de Lancamento *</label>
            <select className="input-field" {...field}>
              <option value="receber">Contas a Receber</option>
              <option value="pagar">Contas a Pagar</option>
            </select>
            {errors.tipo_lancamento && <p className="text-xs text-red-500 mt-0.5">{errors.tipo_lancamento.message}</p>}
          </div>
        )}
      />
      <Controller
        name="categoria_id"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Categoria *</label>
            <select className="input-field" value={field.value || ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}>
              <option value="">Selecione...</option>
              {categorias.map((c) => (
                <option key={c.id ?? c.codigo} value={c.id ?? c.codigo}>{c.nome}</option>
              ))}
            </select>
            {errors.categoria_id && <p className="text-xs text-red-500 mt-0.5">{errors.categoria_id.message}</p>}
          </div>
        )}
      />
      <Controller
        name="dias_vencimento"
        control={control}
        render={({ field }) => (
          <Input
            label="Dias para Vencimento"
            type="number"
            error={errors.dias_vencimento?.message}
            value={field.value ?? ''}
            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
          />
        )}
      />
      <Controller
        name="descricao_template"
        control={control}
        render={({ field }) => (
          <div>
            <Input label="Template de Descricao" error={errors.descricao_template?.message} {...field} />
            <p className="text-xs text-text-muted mt-1">
              Variaveis disponiveis: {'{nome}'}, {'{quantidade}'}, {'{cliente}'}
            </p>
          </div>
        )}
      />
      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ativo" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="rounded border-border-subtle" />
            <label htmlFor="ativo" className="text-sm text-text-secondary">Ativo</label>
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
