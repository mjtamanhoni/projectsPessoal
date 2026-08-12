import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { formatCpfCnpj, formatPhone, formatCelular } from '@/lib/utils';
import { clienteSchema, type ClienteInput } from '@/schemas';
import type { Cliente } from '@/types';

interface ClienteFormProps {
  onSubmit: (data: Cliente) => void;
  onCancel: () => void;
  initial?: Cliente | null;
}

export function ClienteForm({ onSubmit, onCancel, initial }: ClienteFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      cpf_cnpj: initial.cpf_cnpj || '',
      telefone: initial.telefone || '',
      celular: initial.celular || '',
      endereco: initial.endereco || '',
      email: initial.email || '',
    } : {
      nome: '',
      cpf_cnpj: '',
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
            autoFocus 
            {...field} 
          />
        )}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="cpf_cnpj"
          control={control}
          render={({ field }) => (
            <Input
              label="CPF/CNPJ *"
              error={errors.cpf_cnpj?.message}
              placeholder="CPF ou CNPJ"
              {...field}
              onChange={(e) => {
                field.onChange(formatCpfCnpj(e.target.value));
              }}
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
      </div>
      
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