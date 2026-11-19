import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Spinner } from '@/components/ui/Spinner';
import { Save } from 'lucide-react';
import { pontoLancamentoSchema, type PontoLancamentoInput } from '@/schemas';
import type { PontoLancamento, Usuario, Cliente, Servico } from '@/types';
import api from '@/lib/api';

function hojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function horaLocal(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface PontoLancamentoFormProps {
  onSubmit: (data: PontoLancamento) => void;
  onCancel: () => void;
  initial?: PontoLancamento | null;
  editingId?: number | null;
}

export function PontoLancamentoForm({ onSubmit, onCancel, initial, editingId }: PontoLancamentoFormProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { handleSubmit, formState: { errors }, control, watch, setValue } = useForm<PontoLancamentoInput>({
    resolver: zodResolver(pontoLancamentoSchema),
    defaultValues: initial ? {
      usuarioId: initial.usuarioId || undefined,
      clienteId: initial.clienteId || undefined,
      servicoId: initial.servicoId || undefined,
      dataServico: initial.dataServico || hojeLocal(),
      horaLancamento: initial.horaLancamento || horaLocal(),
      tipoLancamento: initial.tipoLancamento || 'E',
      valorHora: initial.valorHora || 0,
      observacoes: initial.observacoes || '',
    } : {
      usuarioId: undefined,
      clienteId: undefined,
      servicoId: undefined,
      dataServico: hojeLocal(),
      horaLancamento: horaLocal(),
      tipoLancamento: 'E',
      valorHora: 0,
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

  const servicoId = watch('servicoId');

  useEffect(() => {
    if (!servicoId) return;
    const servico = servicos.find((s) => (s.id ?? s.codigo) === servicoId);
    if (servico) {
      setValue('valorHora', servico.valorHora || 0);
    }
  }, [servicoId, servicos, setValue]);

  const handleFormSubmit = (data: PontoLancamentoInput) => {
    const servico = servicos.find((s) => (s.id ?? s.codigo) === data.servicoId);
    onSubmit({
      usuarioId: data.usuarioId,
      clienteId: data.clienteId,
      servicoId: data.servicoId,
      dataServico: data.dataServico,
      horaLancamento: data.horaLancamento,
      tipoLancamento: data.tipoLancamento,
      valorHora: data.valorHora || servico?.valorHora || 0,
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

      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="dataServico"
          control={control}
          render={({ field }) => (
            <Input label="Data *" type="date" error={errors.dataServico?.message} {...field} />
          )}
        />
        <Controller
          name="horaLancamento"
          control={control}
          render={({ field }) => (
            <Input label="Hora *" type="time" error={errors.horaLancamento?.message} {...field} />
          )}
        />
      </div>

      <Controller
        name="tipoLancamento"
        control={control}
        render={({ field }) => (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Tipo *</label>
            <select
              className="input-field"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value as 'E' | 'S')}
            >
              <option value="E">Entrada</option>
              <option value="S">Saida</option>
            </select>
            {errors.tipoLancamento && <p className="text-xs text-accent-red mt-1">{errors.tipoLancamento.message}</p>}
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
