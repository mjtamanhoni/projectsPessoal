import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import type { BandeiraCartao } from '@/types';
import { useRef } from 'react';

const bandeiraCartaoSchema = z.object({
  codigo: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  nome: z.string().min(1, 'Nome e obrigatorio').max(100),
  imagem: z.string().nullable().optional(),
  status: z.number().optional(),
});

type BandeiraCartaoFormData = z.infer<typeof bandeiraCartaoSchema>;

interface BandeiraCartaoFormProps {
  onSubmit: (data: BandeiraCartaoFormData) => Promise<void>;
  onCancel: () => void;
  initial?: BandeiraCartao | null;
}

export function BandeiraCartaoForm({ onSubmit, onCancel, initial }: BandeiraCartaoFormProps) {
  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<BandeiraCartaoFormData>({
    resolver: zodResolver(bandeiraCartaoSchema),
    defaultValues: initial ?? { nome: '', imagem: null, status: 1 },
  });

  const imagem = watch('imagem');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setValue('imagem', base64, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setValue('imagem', null, { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} autoFocus {...field} />
        )}
      />
      <div>
        <label className="label-field">Imagem</label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm text-text-secondary file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"
          />
          {imagem && (
            <button type="button" onClick={removeImage} className="text-sm text-accent-red hover:underline">
              Remover
            </button>
          )}
        </div>
        {imagem && (
          <div className="mt-2">
            <img src={imagem} alt="Preview" className="h-12 w-auto object-contain border border-border-primary rounded" />
          </div>
        )}
      </div>
      <div>
        <label className="label-field">Status</label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              value={field.value ?? 1}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className="input-field"
            >
              <option value={1}>Ativo</option>
              <option value={0}>Inativo</option>
            </select>
          )}
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
