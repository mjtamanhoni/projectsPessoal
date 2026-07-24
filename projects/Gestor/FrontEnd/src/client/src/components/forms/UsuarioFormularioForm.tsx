import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus } from 'lucide-react';
import { usuarioFormularioSchema, type UsuarioFormularioInput } from '@/schemas';
import type { UsuarioFormulario } from '@/types';

interface UsuarioFormularioFormProps {
  onSubmit: (data: UsuarioFormulario) => void;
  onCancel: () => void;
  initial?: UsuarioFormulario | null;
  usuarios?: { id?: number; nome: string }[];
  formularios?: { id?: number; nome: string }[];
}

export function UsuarioFormularioForm({ onSubmit, onCancel, initial, usuarios = [], formularios = [] }: UsuarioFormularioFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<UsuarioFormularioInput>({
    resolver: zodResolver(usuarioFormularioSchema),
    defaultValues: initial ? {
      usuarioId: initial.usuarioId || 0,
      formularioId: initial.formularioId || 0,
    } : {
      usuarioId: 0,
      formularioId: 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="usuarioId"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Usuario *</label>
            <select
              value={field.value || ''}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-border-primary rounded-lg bg-background-primary text-text-primary outline-none focus:border-accent-primary transition-colors"
            >
              <option value="">Selecione um usuario</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
            {errors.usuarioId && <p className="text-xs text-accent-red mt-1">{errors.usuarioId.message}</p>}
          </div>
        )}
      />

      <Controller
        name="formularioId"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Formulario *</label>
            <select
              value={field.value || ''}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-border-primary rounded-lg bg-background-primary text-text-primary outline-none focus:border-accent-primary transition-colors"
            >
              <option value="">Selecione um formulario</option>
              {formularios.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
            {errors.formularioId && <p className="text-xs text-accent-red mt-1">{errors.formularioId.message}</p>}
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
