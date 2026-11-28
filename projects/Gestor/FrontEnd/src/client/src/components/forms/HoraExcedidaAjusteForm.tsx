import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Spinner } from '@/components/ui/Spinner';
import { Save } from 'lucide-react';
import { horaExcedidaAjusteSchema, type HoraExcedidaAjusteFormInput } from '@/schemas';
import { competenciaAtual, formatHoras, parseHorasTexto } from '@/lib/ponto';
import type { HoraExcedida, HoraExcedidaAjusteInput, Usuario, Cliente, Servico } from '@/types';
import api from '@/lib/api';

interface HoraExcedidaAjusteFormProps {
  onSubmit: (data: HoraExcedidaAjusteInput) => void;
  onCancel: () => void;
  initial?: HoraExcedida | null;
  editingId?: number | null;
}

function formatHorasComSinal(valor: number): string {
  return valor < 0 ? `-${formatHoras(valor)}` : formatHoras(valor);
}

function parseHorasComSinal(valor: string): number {
  const negativo = valor.trim().startsWith('-');
  const numero = parseHorasTexto(valor.replace('-', ''));
  return negativo ? -numero : numero;
}

export function HoraExcedidaAjusteForm({ onSubmit, onCancel, initial, editingId }: HoraExcedidaAjusteFormProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const editando = !!editingId;

  const competenciaInicial = initial
    ? `${initial.anoOrigem}-${String(initial.mesOrigem).padStart(2, '0')}`
    : competenciaAtual();
  const horasIniciais = initial ? formatHorasComSinal(initial.ajusteManual ?? 0) : '00:00:00';

  const { handleSubmit, formState: { errors }, control } = useForm<HoraExcedidaAjusteFormInput>({
    resolver: zodResolver(horaExcedidaAjusteSchema),
    defaultValues: {
      usuarioId: initial?.usuarioId || undefined,
      clienteId: initial?.clienteId || undefined,
      servicoId: initial?.servicoId || undefined,
      competencia: competenciaInicial,
      horas: horasIniciais,
      observacoes: initial?.observacoes || '',
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

  const handleFormSubmit = (data: HoraExcedidaAjusteFormInput) => {
    const [ano, mes] = data.competencia.split('-').map(Number);
    onSubmit({
      usuarioId: data.usuarioId,
      clienteId: data.clienteId,
      servicoId: data.servicoId,
      ano,
      mes,
      ajusteHoras: parseHorasComSinal(data.horas),
      observacoes: data.observacoes || '',
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
              disabled={editando}
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
              disabled={editando}
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
              disabled={editando}
            />
            {errors.servicoId && <p className="text-xs text-accent-red mt-1">{errors.servicoId.message}</p>}
          </div>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="competencia"
          control={control}
          render={({ field }) => (
            <Input
              label="Competencia *"
              type="month"
              error={errors.competencia?.message}
              disabled={editando}
              {...field}
            />
          )}
        />
        <Controller
          name="horas"
          control={control}
          render={({ field }) => (
            <Input
              label="Ajuste de horas *"
              placeholder="00:00:00"
              error={errors.horas?.message}
              className="font-mono"
              {...field}
            />
          )}
        />
      </div>

      <p className="text-xs text-text-muted">
        Aceita valores acima de 24h e negativos (ex.: <span className="font-mono">33:45:15</span> ou{' '}
        <span className="font-mono">-02:00:00</span>). O ajuste e somado ao saldo acumulado calculado
        automaticamente a partir da competencia informada.
      </p>

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
