import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Spinner } from '@/components/ui/Spinner';
import { Save } from 'lucide-react';
import { horaTrabalhadaSchema, type HoraTrabalhadaInput } from '@/schemas';
import type { HoraTrabalhada, Cliente, Servico, Usuario } from '@/types';
import api from '@/lib/api';
import { ceilTo2 } from '@/lib/utils';

function formatHoras(decimal: number): string {
  if (!decimal) return '00:00:00';
  const abs = Math.abs(decimal);
  const totalSeconds = Math.round(abs * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface HoraTrabalhadaFormProps {
  onSubmit: (data: HoraTrabalhadaInput) => void;
  onCancel: () => void;
  initial?: HoraTrabalhada | null;
  focusDate?: boolean;
}

export function HoraTrabalhadaForm({ onSubmit, onCancel, initial, focusDate }: HoraTrabalhadaFormProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { handleSubmit, formState: { errors }, control, watch, setValue } = useForm<HoraTrabalhadaInput>({
    resolver: zodResolver(horaTrabalhadaSchema),
    defaultValues: initial ? {
      usuarioId: initial.usuarioId || undefined,
      dataServico: initial.dataServico || '',
      horaInicio: initial.horaInicio || '',
      horaTermino: initial.horaTermino || '',
      valorHora: initial.valorHora || 0,
      observacoes: initial.observacoes || '',
      clienteId: initial.clienteId || undefined,
      servicoId: initial.servicoId || undefined,
    } : {
      usuarioId: undefined,
      dataServico: new Date().toISOString().split('T')[0],
      horaInicio: '',
      horaTermino: '',
      valorHora: 0,
      observacoes: '',
      clienteId: undefined,
      servicoId: undefined,
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientesRes, servicosRes, usuariosRes] = await Promise.all([
          api.get('/clientes'),
          api.get('/servicos'),
          api.get('/usuarios'),
        ]);
        setClientes(clientesRes.data as Cliente[]);
        setServicos(servicosRes.data as Servico[]);
        setUsuarios(usuariosRes.data as Usuario[]);
      } catch {
        // silently fail
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  const servicoId = watch('servicoId');
  const horaInicio = watch('horaInicio');
  const horaTermino = watch('horaTermino');
  const valorHora = watch('valorHora');
  const servicoSelecionado = servicos.find((s) => (s.id ?? s.codigo) === servicoId);

  useEffect(() => {
    if (servicoSelecionado) {
      setValue('valorHora', servicoSelecionado.valorHora);
    }
  }, [servicoSelecionado, setValue]);

  useEffect(() => {
    if (focusDate) {
      const input = document.querySelector<HTMLInputElement>('.modal-content input[type="date"]');
      if (input) {
        input.focus();
      }
    }
  }, [focusDate]);

  const calcHorasDecimal = (inicio: string, termino: string): number => {
    if (!inicio || !termino) return 0;
    const [hI, mI] = inicio.split(':').map(Number);
    const [hT, mT] = termino.split(':').map(Number);
    const minInicio = hI * 60 + mI;
    const minTermino = hT * 60 + mT;
    if (minTermino > minInicio) {
      return (minTermino - minInicio) / 60;
    }
    return (1440 - minInicio + minTermino) / 60;
  };

  const quantidadeHoras = calcHorasDecimal(horaInicio || '', horaTermino || '');
  const totalHorasCalc = ceilTo2(quantidadeHoras * Number(valorHora || 0));

  if (loadingData) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  const handleFormSubmit = (data: HoraTrabalhadaInput) => {
    onSubmit(data);
  };

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
        name="servicoId"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Servico *</label>
            <RegistroSelect<number>
              value={field.value ?? null}
              onChange={(v) => field.onChange(v)}
              options={servicos.map((s) => ({
                value: (s.id ?? s.codigo)!,
                label: s.nome,
                sub: `R$ ${Number(s.valorHora).toFixed(2)}/h`,
              }))}
              title="Selecionar Servico"
            />
            {errors.servicoId && <p className="text-xs text-accent-red mt-1">{errors.servicoId.message}</p>}
          </div>
        )}
      />

      <Controller
        name="dataServico"
        control={control}
        render={({ field }) => (
          <Input label="Data *" type="date" error={errors.dataServico?.message} {...field} />
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="horaInicio"
          control={control}
          render={({ field }) => (
            <Input label="Hora Inicio *" type="time" error={errors.horaInicio?.message} {...field} />
          )}
        />
        <Controller
          name="horaTermino"
          control={control}
          render={({ field }) => (
            <Input label="Hora Termino *" type="time" error={errors.horaTermino?.message} {...field} />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Quantidade Horas</label>
          <div className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-muted text-foreground-secondary text-sm">
            {quantidadeHoras > 0 ? formatHoras(quantidadeHoras) : '-'}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Total (R$)</label>
          <div className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-muted text-foreground-secondary text-sm">
            {totalHorasCalc > 0 ? `R$ ${totalHorasCalc.toFixed(2)}` : '-'}
          </div>
        </div>
      </div>

      <Controller
        name="valorHora"
        control={control}
        render={({ field }) => (
          <Input
            label="Valor/Hora (R$) *"
            type="text"
            inputMode="decimal"
            error={errors.valorHora?.message}
            value={field.value === 0 || field.value === undefined ? '' : Number(field.value).toFixed(2)}
            onChange={(e) => {
              const val = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
              field.onChange(val === '' ? 0 : parseFloat(val));
            }}
            onBlur={(e) => {
              const val = parseFloat(e.target.value.replace(',', '.'));
              if (!isNaN(val)) {
                field.onChange(parseFloat(val.toFixed(2)));
              }
              field.onBlur();
            }}
            name={field.name}
            ref={field.ref}
          />
        )}
      />

      <Controller
        name="clienteId"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Cliente</label>
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
