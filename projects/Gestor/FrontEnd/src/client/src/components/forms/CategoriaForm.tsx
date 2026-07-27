import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { categoriaSchema, type CategoriaInput } from '@/schemas';
import type { Categoria } from '@/types';

interface CategoriaFormProps {
  onSubmit: (data: Categoria) => void;
  onCancel: () => void;
  initial?: Categoria | null;
  tipo: 'pagar' | 'receber';
}

export function CategoriaForm({ onSubmit, onCancel, initial }: CategoriaFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<CategoriaInput>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      descricao: initial.descricao || '',
      ativo: initial.ativo ?? true,
    } : {
      nome: '',
      descricao: '',
      ativo: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} autoFocus {...field} />
        )}
      />
      <Controller
        name="descricao"
        control={control}
        render={({ field }) => (
          <Input label="Descricao" {...field} />
        )}
      />
      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="ativo" 
              checked={field.value} 
              onChange={(e) => field.onChange(e.target.checked)} 
              className="rounded border-border-subtle" 
            />
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