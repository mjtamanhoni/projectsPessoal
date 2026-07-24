import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { formatPhone, formatCelular } from '@/lib/utils';
import { fornecedorSchema, type FornecedorInput } from '@/schemas';
import type { Fornecedor } from '@/types';

interface FornecedorFormProps {
  onSubmit: (data: Fornecedor) => void;
  onCancel: () => void;
  initial?: Fornecedor | null;
}

export function FornecedorForm({ onSubmit, onCancel, initial }: FornecedorFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<FornecedorInput>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      telefone: initial.telefone || '',
      celular: initial.celular || '',
      endereco: initial.endereco || '',
      email: initial.email || '',
    } : {
      nome: '',
      telefone: '',
      celular: '',
      endereco: '',
      email: '',
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
      <Controller
        name="telefone"
        control={control}
        render={({ field }) => (
          <Input 
            label="Telefone" 
            placeholder="(XX) XXXX-XXXX"
            {...field}
            onChange={(e) => {
              const formatted = formatPhone(e.target.value);
              field.onChange(formatted);
            }}
          />
        )}
      />
      <Controller
        name="celular"
        control={control}
        render={({ field }) => (
          <Input 
            label="Celular" 
            placeholder="(XX) XXXXX-XXXX"
            {...field}
            onChange={(e) => {
              const formatted = formatCelular(e.target.value);
              field.onChange(formatted);
            }}
          />
        )}
      />
      <Controller
        name="endereco"
        control={control}
        render={({ field }) => (
          <Input label="Endereco" {...field} />
        )}
      />
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input label="Email" type="email" error={errors.email?.message} {...field} />
        )}
      />
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}