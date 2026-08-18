import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { formatCurrency } from '@/lib/utils';
import type { Adicional, ProdutoVendaItem } from '@/types';
import api from '@/lib/api';

const produtoVendaItemSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  produto_venda_id: z.number().refine((v) => v > 0, 'Produto de venda e obrigatorio'),
  nome: z.string().min(1, 'Nome e obrigatorio').max(200),
  pode_remover: z.boolean(),
  pode_adicionar: z.boolean(),
  adicional_id: z.number().int().positive().nullable().optional(),
  ordem: z.number().int().min(0, 'Ordem deve ser maior ou igual a zero'),
  ativo: z.boolean().optional(),
});

type ProdutoVendaItemInput = z.infer<typeof produtoVendaItemSchema>;

interface ProdutoVendaItemFormProps {
  onSubmit: (data: ProdutoVendaItem) => void;
  onCancel: () => void;
  initial?: ProdutoVendaItem | null;
  produtoVendaId?: number;
  ordemInicial?: number;
}

export function ProdutoVendaItemForm({ onSubmit, onCancel, initial, produtoVendaId, ordemInicial }: ProdutoVendaItemFormProps) {
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [erroAdicionais, setErroAdicionais] = useState('');

  useEffect(() => {
    api.get<Adicional[]>('/adicionais')
      .then((r) => setAdicionais(r.data))
      .catch(() => setErroAdicionais('Erro ao carregar os adicionais. Verifique a conexão com o servidor.'));
  }, []);

  const { handleSubmit, formState: { errors }, control, watch, setValue } = useForm<ProdutoVendaItemInput>({
    resolver: zodResolver(produtoVendaItemSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      produto_venda_id: initial.produto_venda_id || produtoVendaId || 0,
      pode_remover: initial?.pode_remover ?? false,
      pode_adicionar: initial?.pode_adicionar ?? false,
      adicional_id: initial?.adicional_id ?? null,
      ordem: initial.ordem ?? 0,
      ativo: initial.ativo ?? true,
    } : {
      nome: '',
      produto_venda_id: produtoVendaId ?? 0,
      pode_remover: false,
      pode_adicionar: false,
      adicional_id: null,
      ordem: ordemInicial ?? 0,
      ativo: true,
    },
  });

  const watchAdicional = watch('adicional_id');
  const watchNome = watch('nome');
  const adicionalAtual = adicionais.find((a) => (a.id ?? a.codigo) === watchAdicional);

  const selecionarAdicional = (id: number) => {
    const adicional = adicionais.find((a) => (a.id ?? a.codigo) === id);
    setValue('adicional_id', id);
    if (adicional) {
      setValue('nome', adicional.nome);
    }
  };

  const limparAdicional = () => {
    if (adicionalAtual && watchNome === adicionalAtual.nome) {
      setValue('nome', '');
    }
    setValue('adicional_id', null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="adicional_id"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="label-field">Adicional de preço</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={selecionarAdicional}
              onClear={limparAdicional}
              options={adicionais.filter((a) => Boolean(a.ativo)).map((a) => ({
                value: (a.id ?? a.codigo)!,
                label: `${a.nome} — ${formatCurrency(Number(a.preco ?? 0))}`,
              }))}
              title="Selecionar Adicional"
              placeholder="Sem adicional (adição gratuita)"
            />
            <p className="text-xs text-text-tertiary">
              O preço da adição é o do adicional cadastrado
              {adicionalAtual ? `: ${formatCurrency(Number(adicionalAtual.preco ?? 0))}` : ' (R$ 0,00)'}
              {initial?.adicional_nome && !adicionalAtual && ` — vigente: ${initial.adicional_nome} (${formatCurrency(Number(initial.adicional_preco ?? 0))})`}
            </p>
            {erroAdicionais && <p className="text-xs text-accent-red">{erroAdicionais}</p>}
          </div>
        )}
      />
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