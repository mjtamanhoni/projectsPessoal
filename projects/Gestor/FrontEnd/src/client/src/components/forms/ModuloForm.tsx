import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { moduloSchema, type ModuloInput } from '@/schemas';
import type { Modulo } from '@/types';

interface ModuloFormProps {
  onSubmit: (data: Modulo) => void;
  onCancel: () => void;
  initial?: Modulo | null;
}

export function ModuloForm({ onSubmit, onCancel, initial }: ModuloFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<ModuloInput>({
    resolver: zodResolver(moduloSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      descricao: initial.descricao || '',
    } : {
      nome: '',
      descricao: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} {...field} />
        )}
      />
      <Controller
        name="descricao"
        control={control}
        render={({ field }) => (
          <Input label="Descricao" {...field} />
        )}
      />
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
