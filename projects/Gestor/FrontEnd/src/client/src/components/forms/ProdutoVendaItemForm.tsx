import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import type { ProdutoVendaItem } from '@/types';

const produtoVendaItemSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_venda_id: z.number().refine((v) => v > 0, 'Produto de venda e obrigatorio'),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  pode_remover: z.boolean(),
  pode_adicionar: z.boolean(),
  preco_adicional: z.number().min(0, 'Preco adicional deve ser maior ou igual a zero'),
  ordem: z.number().int().min(0, 'Ordem deve ser maior ou igual a zero'),
  ativo: z.boolean().optional(),
});

type ProdutoVendaItemInput = z.infer<typeof produtoVendaItemSchema>;

interface ProdutoVendaItemFormProps {
  onSubmit: (data: ProdutoVendaItem) => void;
  onCancel: () => void;
  initial?: ProdutoVendaItem | null;
  produtoVendaId?: number;
}

export function ProdutoVendaItemForm({ onSubmit, onCancel, initial, produtoVendaId }: ProdutoVendaItemFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<ProdutoVendaItemInput>({
    resolver: zodResolver(produtoVendaItemSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      produto_venda_id: initial.produto_venda_id || produtoVendaId || 0,
      pode_remover: initial?.pode_remover ?? false,
      pode_adicionar: initial?.pode_adicionar ?? false,
      preco_adicional: initial.preco_adicional ?? 0,
      ordem: initial.ordem ?? 0,
      ativo: initial.ativo ?? true,
    } : {
      nome: '',
      produto_venda_id: produtoVendaId ?? 0,
      pode_remover: false,
      pode_adicionar: false,
      preco_adicional: 0,
      ordem: 0,
      ativo: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} autoFocus placeholder="Ex.: Pão, Bife, Queijo..." {...field} />
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Controller
          name="pode_remover"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pode_remover"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="rounded border-border-subtle"
              />
              <label htmlFor="pode_remover" className="text-sm text-text-secondary">Pode ser removido</label>
            </div>
          )}
        />
        <Controller
          name="pode_adicionar"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pode_adicionar"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="rounded border-border-subtle"
              />
              <label htmlFor="pode_adicionar" className="text-sm text-text-secondary">Pode ser adicionado</label>
            </div>
          )}
        />
      </div>
      <Controller
        name="preco_adicional"
        control={control}
        render={({ field }) => (
          <Input
            label="Preço quando adicionado (R$)"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.preco_adicional?.message}
            value={field.value ? formatCurrencyInput(Number(field.value).toFixed(2)) : ''}
            onChange={(e) => {
              const parsed = parseCurrencyInput(e.target.value);
              field.onChange(parsed);
            }}
          />
        )}
      />
      <Controller
        name="ordem"
        control={control}
        render={({ field }) => (
          <Input
            label="Ordem *"
            type="number"
            min={0}
            error={errors.ordem?.message}
            {...field}
            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
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