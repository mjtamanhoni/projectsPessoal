import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Save } from 'lucide-react';
import { servicoSchema, type ServicoInput } from '@/schemas';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import type { Servico } from '@/types';

interface ServicoFormProps {
  onSubmit: (data: Servico) => void;
  onCancel: () => void;
  initial?: Servico | null;
  editingId?: number | null;
}

export function ServicoForm({ onSubmit, onCancel, initial, editingId }: ServicoFormProps) {
  const { handleSubmit, formState: { errors }, control } = useForm<ServicoInput>({
    resolver: zodResolver(servicoSchema),
    defaultValues: initial ? {
      nome: initial.nome || '',
      valorHora: initial.valorHora ?? 0,
      horasMinimas: initial.horasMinimas || '00:00:00',
    } : {
      nome: '',
      valorHora: 0,
      horasMinimas: '00:00:00',
    },
  });

  const handleFormSubmit = (data: ServicoInput) => {
    onSubmit({
      nome: data.nome,
      valorHora: data.valorHora,
      horasMinimas: data.horasMinimas,
      id: editingId ?? initial?.id,
      codigo: editingId ? undefined : initial?.codigo,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Controller
        name="nome"
        control={control}
        render={({ field }) => (
          <Input label="Nome *" error={errors.nome?.message} autoFocus {...field} />
        )}
      />

      <Controller
        name="valorHora"
        control={control}
        render={({ field }) => (
          <Input
            label="Valor/Hora (R$) *"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.valorHora?.message}
            value={field.value ? formatCurrencyInput(Number(field.value).toFixed(2)) : ''}
            onChange={(e) => {
              const parsed = parseCurrencyInput(e.target.value);
              field.onChange(parsed);
            }}
            onBlur={() => {
              if (field.value && !field.value.toString().includes(',')) {
                field.onChange(field.value);
              }
            }}
          />
        )}
      />

      <Controller
        name="horasMinimas"
        control={control}
        render={({ field }) => {
          const formatInterval = (v: string): string => {
            const digits = v.replace(/\D/g, '');
            if (digits.length <= 2) return digits;
            if (digits.length <= 4) return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
            const h = digits.slice(0, -4);
            const m = digits.slice(-4, -2);
            const s = digits.slice(-2);
            return `${h}:${m}:${s}`;
          };

          return (
            <Input
              label="Horas Minimas *"
              type="text"
              placeholder="000:00:00"
              error={errors.horasMinimas?.message}
              value={field.value || ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                const formatted = formatInterval(raw);
                field.onChange(formatted);
              }}
              onBlur={() => {
                const v = field.value || '';
                const parts = v.split(':');
                if (parts.length === 3) {
                  const h = parts[0].padStart(2, '0');
                  const m = parts[1].padStart(2, '0');
                  const s = parts[2].padStart(2, '0');
                  field.onChange(`${h}:${m}:${s}`);
                }
              }}
            />
          );
        }}
      />

      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Save size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
