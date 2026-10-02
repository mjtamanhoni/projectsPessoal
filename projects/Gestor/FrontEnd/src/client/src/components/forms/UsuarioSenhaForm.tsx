import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KeyRound } from 'lucide-react';
import {
  usuarioSenhaSchema,
  usuarioAdminSenhaSchema,
  type UsuarioSenhaInput,
  type UsuarioAdminSenhaInput,
} from '@/schemas';

interface UsuarioSenhaFormProps {
  onSubmit: (data: UsuarioSenhaInput | UsuarioAdminSenhaInput) => void;
  onCancel: () => void;
  usuarioId: number;
  usuarioNome: string;
  admin?: boolean;
}

export function UsuarioSenhaForm({ onSubmit, onCancel, usuarioId, usuarioNome, admin = false }: UsuarioSenhaFormProps) {
  const adminForm = useForm<UsuarioAdminSenhaInput>({
    resolver: zodResolver(usuarioAdminSenhaSchema),
    defaultValues: { id: usuarioId, novaSenha: '', confirmarSenha: '' },
  });
  const userForm = useForm<UsuarioSenhaInput>({
    resolver: zodResolver(usuarioSenhaSchema),
    defaultValues: { id: usuarioId, senhaAtual: '', novaSenha: '', confirmarSenha: '' },
  });

  if (admin) {
    const { handleSubmit, formState: { errors }, control } = adminForm;
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-text-secondary">
          Redefinir senha de <strong>{usuarioNome}</strong> sem informar a senha anterior.
        </p>
        <Controller
          name="novaSenha"
          control={control}
          render={({ field }) => (
            <Input label="Nova Senha *" type="password" error={errors.novaSenha?.message} {...field} />
          )}
        />
        <Controller
          name="confirmarSenha"
          control={control}
          render={({ field }) => (
            <Input label="Confirmar Senha *" type="password" error={errors.confirmarSenha?.message} {...field} />
          )}
        />
        <div className="flex justify-center gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="submit"><KeyRound size={16} /> Alterar Senha</Button>
        </div>
      </form>
    );
  }

  const { handleSubmit, formState: { errors }, control } = userForm;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-text-secondary">
        Alterar senha de <strong>{usuarioNome}</strong>
      </p>
      <Controller
        name="senhaAtual"
        control={control}
        render={({ field }) => (
          <Input label="Senha Atual *" type="password" error={errors.senhaAtual?.message} {...field} />
        )}
      />
      <Controller
        name="novaSenha"
        control={control}
        render={({ field }) => (
          <Input label="Nova Senha *" type="password" error={errors.novaSenha?.message} {...field} />
        )}
      />
      <Controller
        name="confirmarSenha"
        control={control}
        render={({ field }) => (
          <Input label="Confirmar Senha *" type="password" error={errors.confirmarSenha?.message} {...field} />
        )}
      />
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><KeyRound size={16} /> Alterar Senha</Button>
      </div>
    </form>
  );
}
