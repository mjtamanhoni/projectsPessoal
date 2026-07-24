import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KeyRound } from 'lucide-react';
import { usuarioPinSchema, type UsuarioPinInput } from '@/schemas';

interface UsuarioPinFormProps {
  onSubmit: (data: UsuarioPinInput) => void;
  onCancel: () => void;
  usuarioId: number;
  usuarioNome: string;
}

export function UsuarioPinForm({ onSubmit, onCancel, usuarioId, usuarioNome }: UsuarioPinFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<UsuarioPinInput>({
    resolver: zodResolver(usuarioPinSchema),
    defaultValues: {
      id: usuarioId,
      novoPin: '',
      confirmarPin: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-text-secondary">
        Alterar PIN de <strong>{usuarioNome}</strong>
      </p>
      <Controller
        name="novoPin"
        control={control}
        render={({ field }) => (
          <Input label="Novo PIN *" type="password" maxLength={4} placeholder="0000" error={errors.novoPin?.message} {...field} />
        )}
      />
      <Controller
        name="confirmarPin"
        control={control}
        render={({ field }) => (
          <Input label="Confirmar PIN *" type="password" maxLength={4} placeholder="0000" error={errors.confirmarPin?.message} {...field} />
        )}
      />
      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><KeyRound size={16} /> Alterar PIN</Button>
      </div>
    </form>
  );
}