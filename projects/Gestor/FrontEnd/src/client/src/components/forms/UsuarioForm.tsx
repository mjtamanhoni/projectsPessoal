import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { usuarioSchema, type UsuarioInput } from '@/schemas';
import type { Usuario } from '@/types';

interface UsuarioFormProps {
  onSubmit: (data: Usuario) => void;
  onCancel: () => void;
  initial?: Usuario | null;
}

export function UsuarioForm({ onSubmit, onCancel, initial }: UsuarioFormProps) {
  const isEditing = !!initial;
  const { handleSubmit, formState: { errors }, control } = useForm<UsuarioInput>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: initial ? {
      codigo: initial.codigo || initial.id,
      nome: initial.nome || '',
      email: initial.email || '',
    } : {
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      pin: '',
      confirmarPin: '',
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
        name="email"
        control={control}
        render={({ field }) => (
          <Input label="Email" type="email" error={errors.email?.message} {...field} />
        )}
      />
      {!isEditing && (
        <>
          <div className="border-t border-border-subtle pt-4 mt-4">
            <p className="text-sm font-medium text-text-secondary mb-3">Credenciais de Acesso</p>
          </div>
          <Controller
            name="senha"
            control={control}
            render={({ field }) => (
              <Input label="Senha *" type="password" error={errors.senha?.message} {...field} />
            )}
          />
          <Controller
            name="confirmarSenha"
            control={control}
            render={({ field }) => (
              <Input label="Confirmar Senha *" type="password" error={errors.confirmarSenha?.message} {...field} />
            )}
          />
          <Controller
            name="pin"
            control={control}
            render={({ field }) => (
              <Input label="PIN *" maxLength={4} placeholder="0000" error={errors.pin?.message} {...field} />
            )}
          />
          <Controller
            name="confirmarPin"
            control={control}
            render={({ field }) => (
              <Input label="Confirmar PIN *" maxLength={4} placeholder="0000" error={errors.confirmarPin?.message} {...field} />
            )}
          />
        </>
      )}
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Plus size={16} /> Salvar</Button>
      </div>
    </form>
  );
}