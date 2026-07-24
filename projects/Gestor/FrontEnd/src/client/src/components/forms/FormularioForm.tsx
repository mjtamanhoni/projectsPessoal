import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { formularioSchema, type FormularioInput } from '@/schemas';
import type { Formulario } from '@/types';

interface FormularioFormProps {
  onSubmit: (data: Formulario) => void;
  onCancel: () => void;
  initial?: Formulario | null;
}

export function FormularioForm({ onSubmit, onCancel, initial }: FormularioFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<FormularioInput>({
    resolver: zodResolver(formularioSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
    } : {
      nome: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input 
            label="Nome *" 
            error={errors.nome?.message} 
            {...field} 
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
