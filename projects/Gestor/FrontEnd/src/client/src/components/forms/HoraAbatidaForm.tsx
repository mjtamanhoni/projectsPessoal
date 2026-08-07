import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Spinner } from '@/components/ui/Spinner';
import { Save } from 'lucide-react';
import { horaAbatidaSchema, type HoraAbatidaInput } from '@/schemas';
import type { HoraAbatida, Usuario, Cliente, Servico } from '@/types';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import api from '@/lib/api';

function formatHorasAbatidas(decimal: number): string {
  if (!decimal) return '00:00:00';
  const abs = Math.abs(decimal);
  const totalSeconds = Math.round(abs * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface HoraAbatidaFormProps {
  onSubmit: (data: HoraAbatida) => void;
  onCancel: () => void;
  initial?: HoraAbatida | null;
  editingId?: number | null;
}

export function HoraAbatidaForm({ onSubmit, onCancel, initial, editingId }: HoraAbatidaFormProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { handleSubmit, formState: { errors }, control, watch, setValue } = useForm<HoraAbatidaInput>({
    resolver: zodResolver(horaAbatidaSchema),
    defaultValues: initial ? {
      usuarioId: initial.usuarioId || undefined,
      clienteId: initial.clienteId || undefined,
      servicoId: initial.servicoId || undefined,
      dataAbatimento: initial.dataAbatimento || '',
      valor: initial.valor || 0,
      valorHora: initial.valorHora || 0,
      quantidadeHoras: initial.quantidadeHoras || 0,
      observacoes: initial.observacoes || '',
    } : {
      usuarioId: undefined,
      clienteId: undefined,
      servicoId: undefined,
      dataAbatimento: new Date().toISOString().split('T')[0],
      valor: 0,
      valorHora: 0,
      quantidadeHoras: 0,
      observacoes: '',
    },
  });

  useEffect(() => {
    Promise.all([
      api.get('/usuarios'),
      api.get('/clientes'),
      api.get('/servicos'),
    ]).then(([uRes, cRes, sRes]) => {
      setUsuarios(uRes.data as Usuario[]);
      setClientes(cRes.data as Cliente[]);
      setServicos(sRes.data as Servico[]);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, []);

  const valor = watch('valor');
  const valorHora = watch('valorHora');
  const servicoId = watch('servicoId');

  const horasCalculadas = useMemo(() => {
    if (!valor || !valorHora || valorHora <= 0) return 0;
    return valor / valorHora;
  }, [valor, valorHora]);

  useEffect(() => {
    if (servicoId) {
      const servico = servicos.find((s) => (s.id ?? s.codigo) === servicoId);
      if (servico) {
        setValue('valorHora', servico.valorHora);
      }
    }
  }, [servicoId, servicos, setValue]);

  const handleFormSubmit = (data: HoraAbatidaInput) => {
    onSubmit({
      usuarioId: data.usuarioId,
      clienteId: data.clienteId,
      servicoId: data.servicoId,
      dataAbatimento: data.dataAbatimento,
      valor: data.valor,
      valorHora: data.valorHora,
      quantidadeHoras: horasCalculadas,
      observacoes: data.observacoes,
      id: editingId ?? initial?.id,
      codigo: editingId ? undefined : initial?.codigo,
    });
  };

  if (loadingData) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Controller
        name="usuarioId"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Usuario *</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={usuarios.map((u) => ({ value: (u.id ?? u.codigo)!, label: u.nome }))}
              title="Selecionar Usuario"
            />
            {errors.usuarioId && <p className="text-xs text-accent-red mt-1">{errors.usuarioId.message}</p>}
          </div>
        )}
      />

      <Controller
        name="clienteId"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Cliente *</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={clientes.map((c) => ({ value: (c.id ?? c.codigo)!, label: c.nome }))}
              title="Selecionar Cliente"
            />
            {errors.clienteId && <p className="text-xs text-accent-red mt-1">{errors.clienteId.message}</p>}
          </div>
        )}
      />

      <Controller
        name="servicoId"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Servico *</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={servicos.map((s) => ({ value: (s.id ?? s.codigo)!, label: s.nome }))}
              title="Selecionar Servico"
            />
            {errors.servicoId && <p className="text-xs text-accent-red mt-1">{errors.servicoId.message}</p>}
          </div>
        )}
      />

      <Controller
        name="dataAbatimento"
        control={control}
        render={({ field }) => (
          <Input label="Data do Abatimento *" type="date" error={errors.dataAbatimento?.message} {...field} />
        )}
      />

      <Controller
        name="valor"
        control={control}
        render={({ field }) => (
          <Input
            label="Valor a Abater (R$) *"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.valor?.message}
            value={field.value ? formatCurrencyInput(Number(field.value).toFixed(2)) : ''}
            onChange={(e) => {
              const parsed = parseCurrencyInput(e.target.value);
              field.onChange(parsed);
            }}
          />
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
          />
        )}
      />

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Horas Equivalente</label>
        <div className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-muted text-foreground-secondary text-sm font-mono">
          {horasCalculadas > 0 ? formatHorasAbatidas(horasCalculadas) : '00:00:00'}
        </div>
        <p className="text-xs text-text-muted mt-1">Calculado automaticamente: Valor / ValorHora</p>
      </div>

      <Controller
        name="observacoes"
        control={control}
        render={({ field }) => (
          <Input label="Observacoes" error={errors.observacoes?.message} {...field} />
        )}
      />

      <div className="flex justify-center gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit"><Save size={16} /> Salvar</Button>
      </div>
    </form>
  );
}
