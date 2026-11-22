import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { Spinner } from '@/components/ui/Spinner';
import { Save, AlertTriangle, Camera, Crosshair, MapPin, X } from 'lucide-react';
import { pontoLancamentoSchema, type PontoLancamentoInput } from '@/schemas';
import { carregarUltimoLancamento, dataHoje, horaAgora, salvarUltimoLancamento } from '@/lib/ponto';
import type { PontoLancamento, PontoProximoInfo, Usuario, Cliente, Servico } from '@/types';
import api from '@/lib/api';

interface PontoLancamentoFormProps {
  onSubmit: (data: PontoLancamento) => void;
  onCancel: () => void;
  initial?: PontoLancamento | null;
  editingId?: number | null;
}

type GeoStatus = 'idle' | 'buscando' | 'ok' | 'erro';

export function PontoLancamentoForm({ onSubmit, onCancel, initial, editingId }: PontoLancamentoFormProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [proximo, setProximo] = useState<PontoProximoInfo | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(initial?.latitude ? 'ok' : 'idle');
  const [geoErro, setGeoErro] = useState('');
  const editando = !!editingId;

  const ultimo = carregarUltimoLancamento();

  const { handleSubmit, formState: { errors }, control, watch, setValue } = useForm<PontoLancamentoInput>({
    resolver: zodResolver(pontoLancamentoSchema),
    defaultValues: initial ? {
      usuarioId: initial.usuarioId || undefined,
      clienteId: initial.clienteId || undefined,
      servicoId: initial.servicoId || undefined,
      dataServico: initial.dataServico || dataHoje(),
      horaLancamento: initial.horaLancamento || horaAgora(),
      tipoLancamento: initial.tipoLancamento || 'E',
      valorHora: initial.valorHora || 0,
      latitude: initial.latitude,
      longitude: initial.longitude,
      foto: initial.foto,
      observacoes: initial.observacoes || '',
    } : {
      usuarioId: ultimo.usuarioId || undefined,
      clienteId: ultimo.clienteId || undefined,
      servicoId: ultimo.servicoId || undefined,
      dataServico: dataHoje(),
      horaLancamento: horaAgora(),
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
  const usuarioId = watch('usuarioId');
  const dataServico = watch('dataServico');
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const foto = watch('foto');
  const tipoLancamento = watch('tipoLancamento');

  useEffect(() => {
    if (!servicoId) return;
    const servico = servicos.find((s) => (s.id ?? s.codigo) === servicoId);
    if (servico) {
      setValue('valorHora', servico.valorHora || 0);
    }
  }, [servicoId, servicos, setValue]);

  useEffect(() => {
    if (editando || !usuarioId) {
      setProximo(null);
      return;
    }
    let ativo = true;
    api.get('/ponto-eletronico/proximo', {
      params: { usuario_id: usuarioId, data: dataServico },
    }).then((res) => {
      if (!ativo) return;
      const info = res.data as PontoProximoInfo;
      setProximo(info);
      setValue('tipoLancamento', info.tipo);
    }).catch(() => {
      if (ativo) setProximo(null);
    });
    return () => { ativo = false; };
  }, [usuarioId, dataServico, editando, setValue]);

  useEffect(() => {
    if (editando) return;
    capturarLocalizacao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando]);

  function capturarLocalizacao() {
    if (!navigator.geolocation) {
      setGeoStatus('erro');
      setGeoErro('Geolocalizacao nao suportada neste dispositivo');
      return;
    }
    setGeoStatus('buscando');
    setGeoErro('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude', Number(pos.coords.latitude.toFixed(7)));
        setValue('longitude', Number(pos.coords.longitude.toFixed(7)));
        setGeoStatus('ok');
      },
      () => {
        setGeoStatus('erro');
        setGeoErro('Nao foi possivel obter a localizacao. Verifique a permissao do navegador.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  function handleFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 160;
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * escala));
        canvas.height = Math.max(1, Math.round(img.height * escala));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setValue('foto', canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  const fecharDiaAnterior = () => {
    if (!proximo?.dataEmAberto) return;
    setValue('dataServico', proximo.dataEmAberto);
    setValue('horaLancamento', proximo.horaSugeridaFechamento || '23:59');
  };

  const handleFormSubmit = (data: PontoLancamentoInput) => {
    const servico = servicos.find((s) => (s.id ?? s.codigo) === data.servicoId);
    salvarUltimoLancamento({
      usuarioId: data.usuarioId,
      clienteId: data.clienteId,
      servicoId: data.servicoId,
    });
    onSubmit({
      usuarioId: data.usuarioId,
      clienteId: data.clienteId,
      servicoId: data.servicoId,
      dataServico: data.dataServico,
      horaLancamento: data.horaLancamento,
      tipoLancamento: data.tipoLancamento,
      valorHora: data.valorHora || servico?.valorHora || 0,
      latitude: data.latitude,
      longitude: data.longitude,
      foto: data.foto,
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

  const mapaUrl = latitude != null && longitude != null
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null;

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
            {editando ? (
              <select
                className="input-field"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value as 'E' | 'S')}
              >
                <option value="E">Entrada</option>
                <option value="S">Saida</option>
              </select>
            ) : (
              <>
                <input type="hidden" {...field} />
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  tipoLancamento === 'S'
                    ? 'border-orange-300 bg-orange-500/10 text-orange-700'
                    : 'border-green-300 bg-green-500/10 text-green-700'
                }`}>
                  <span className="font-medium">
                    {tipoLancamento === 'S' ? 'Saida' : 'Entrada'} (automatico)
                  </span>
                  {proximo?.ultimo && (
                    <span className="text-xs text-text-muted">
                      Ultima: {proximo.ultimo.tipo === 'E' ? 'Entrada' : 'Saida'} em {proximo.ultimo.data.split('-').reverse().join('/')} {proximo.ultimo.hora}
                    </span>
                  )}
                </div>
              </>
            )}
            {errors.tipoLancamento && <p className="text-xs text-accent-red mt-1">{errors.tipoLancamento.message}</p>}
          </div>
        )}
      />

      {!editando && proximo?.diaEmAberto && (
        <div className="rounded-lg border border-amber-300 bg-amber-500/10 p-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p>
                Ha uma <strong>entrada em aberto</strong> em {proximo.dataEmAberto?.split('-').reverse().join('/')}.
                Registre a saida desse dia antes de iniciar um novo dia.
              </p>
              <Button type="button" variant="secondary" onClick={fecharDiaAnterior}>
                Fechar dia anterior
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border-subtle p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <MapPin size={16} /> Geolocalizacao
          </span>
          <Button type="button" variant="secondary" onClick={capturarLocalizacao} disabled={geoStatus === 'buscando'}>
            <Crosshair size={16} /> {geoStatus === 'buscando' ? 'Buscando...' : 'Capturar'}
          </Button>
        </div>
        {geoStatus === 'ok' && mapaUrl ? (
          <a href={mapaUrl} target="_blank" rel="noreferrer" className="text-xs text-accent-primary hover:underline">
            {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
          </a>
        ) : geoStatus === 'buscando' ? (
          <p className="text-xs text-text-muted">Obtendo localizacao do dispositivo...</p>
        ) : geoStatus === 'erro' ? (
          <p className="text-xs text-accent-red">{geoErro}</p>
        ) : (
          <p className="text-xs text-text-muted">Localizacao opcional; sera gravada junto com a marcacao.</p>
        )}
      </div>

      <div className="rounded-lg border border-border-subtle p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
            <Camera size={16} /> Foto do usuario (opcional)
          </span>
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-primary text-sm cursor-pointer hover:bg-bg-muted transition-colors">
            <Camera size={16} /> Anexar
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFoto} />
          </label>
        </div>
        {foto ? (
          <div className="flex items-center gap-3">
            <img src={foto} alt="Foto do usuario" className="w-16 h-16 rounded-lg object-cover border border-border-subtle" />
            <span className="text-xs text-text-muted">{Math.round(foto.length / 1024)} KB</span>
            <button
              type="button"
              onClick={() => setValue('foto', undefined)}
              className="ml-auto inline-flex items-center gap-1 text-xs text-accent-red hover:underline"
            >
              <X size={14} /> Remover
            </button>
          </div>
        ) : (
          <p className="text-xs text-text-muted">Imagem reduzida automaticamente para economizar espaco no banco.</p>
        )}
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
