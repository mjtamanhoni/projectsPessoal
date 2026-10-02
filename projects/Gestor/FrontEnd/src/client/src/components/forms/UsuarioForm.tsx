import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { usuarioSchema, type UsuarioInput } from '@/schemas';
import type { Usuario, Empresa } from '@/types';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface UsuarioFormProps {
  onSubmit: (data: UsuarioInput) => void;
  onCancel: () => void;
  initial?: Usuario | null;
}

export function UsuarioForm({ onSubmit, onCancel, initial }: UsuarioFormProps) {
  const isEditing = !!initial;
  const { isSuperadmin, user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const { handleSubmit, formState: { errors }, control, setError } = useForm<UsuarioInput>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: initial ? {
      codigo: initial.codigo || initial.id,
      nome: initial.nome || '',
      email: initial.email || '',
      empresa_id: initial.empresa_id || (isSuperadmin ? (user?.empresaId || undefined) : undefined),
    } : {
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      pin: '',
      confirmarPin: '',
    },
  });

  useEffect(() => {
    if (!isSuperadmin) return;
    api.get('/empresas').then((r) => setEmpresas(r.data as Empresa[])).catch(() => {});
  }, [isSuperadmin]);

  const handleValid = (data: UsuarioInput) => {
    if (isSuperadmin && !data.empresa_id) {
      setError('empresa_id', { message: 'Selecione a empresa' });
      return;
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleValid)} className="space-y-4">
      {isSuperadmin && (
        <Controller
          name="empresa_id"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Empresa *</label>
              <select
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-background-input border border-border-primary rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              >
                <option value="">Selecione a empresa...</option>
                {empresas.map((e) => (
                  <option key={e.id ?? e.codigo} value={e.id ?? e.codigo}>
                    {e.fantasia || e.razao_social}{e.cnpj_cpf ? ` - ${e.cnpj_cpf}` : ''}
                  </option>
                ))}
              </select>
              {errors.empresa_id?.message && (
                <p className="text-xs text-accent-red mt-1">{errors.empresa_id.message}</p>
              )}
            </div>
          )}
        />
      )}
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
