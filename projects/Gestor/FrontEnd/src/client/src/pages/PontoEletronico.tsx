import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { PontoLancamentoForm } from '@/components/forms/PontoLancamentoForm';
import { useToast } from '@/context/ToastContext';
import { ACAO } from '@/lib/permissions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { carregarFiltrosPonto, competenciaAtual, formatHoras, salvarFiltrosPonto } from '@/lib/ponto';
import type { Cliente, PontoLancamento, PontoResumo, Servico, Usuario } from '@/types';
import api from '@/lib/api';
import {
  AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, DollarSign, MapPin,
  Minus, Plus, RefreshCw, Timer, User,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const lancamentoColumns = createColumnHelper<PontoLancamento>();
const resumoColumns = createColumnHelper<PontoResumo>();

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes, dia);
}

function getFeriadosBrasil(ano: number): { date: string; nome: string }[] {
  const pascoa = calcularPascoa(ano);
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(pascoa.getDate() + 60);

  const feriados = [
    { date: `${ano}-01-01`, nome: 'Ano Novo' },
    { date: `${ano}-04-21`, nome: 'Tiradentes' },
    { date: `${ano}-05-01`, nome: 'Dia do Trabalho' },
    { date: `${ano}-09-07`, nome: 'Independencia' },
    { date: `${ano}-10-12`, nome: 'N.S. Aparecida' },
    { date: `${ano}-11-02`, nome: 'Finados' },
    { date: `${ano}-11-15`, nome: 'Proclamacao Republica' },
    { date: `${ano}-12-25`, nome: 'Natal' },
  ];

  const formatar = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  feriados.push({ date: formatar(sextaSanta), nome: 'Sexta-feira Santa' });
  feriados.push({ date: formatar(corpusChristi), nome: 'Corpus Christi' });

  return feriados;
}

function calcularHorasPorDia(lancamentos: PontoLancamento[]): Record<string, { horas: number; valor: number }> {
  const mapa: Record<string, { horas: number; valor: number }> = {};
  const grupos = new Map<string, PontoLancamento[]>();

  for (const l of lancamentos) {
    const data = l.dataServico.split('T')[0];
    const chave = `${data}|${l.usuarioId}|${l.clienteId}|${l.servicoId}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(l);
  }

  for (const [chave, lista] of grupos) {
    const data = chave.split('|')[0];
    const ordenados = [...lista].sort(
      (a, b) => a.horaLancamento.localeCompare(b.horaLancamento) || (a.id ?? 0) - (b.id ?? 0),
    );

    let saidasIniciais = 0;
    while (saidasIniciais < ordenados.length && ordenados[saidasIniciais].tipoLancamento === 'S') {
      saidasIniciais++;
    }
    const bloco = saidasIniciais > 0 && saidasIniciais < ordenados.length
      ? [...ordenados.slice(saidasIniciais), ...ordenados.slice(0, saidasIniciais)]
      : ordenados;

    let entrada: PontoLancamento | null = null;
    for (const l of bloco) {
      if (l.tipoLancamento === 'E') {
        if (!entrada) entrada = l;
        continue;
      }
      if (!entrada) continue;
      const [hE, mE] = entrada.horaLancamento.split(':').map(Number);
      const [hS, mS] = l.horaLancamento.split(':').map(Number);
      let minutos = hS * 60 + mS - (hE * 60 + mE);
      if (minutos <= 0) minutos += 1440;
      const horas = minutos / 60;
      if (!mapa[data]) mapa[data] = { horas: 0, valor: 0 };
      mapa[data].horas += horas;
      mapa[data].valor += horas * (entrada.valorHora || 0);
      entrada = null;
    }
  }

  return mapa;
}

export function PontoEletronico() {
  const salvo = useMemo(() => carregarFiltrosPonto('marcacoes'), []);
  const [competencia, setCompetencia] = useState(salvo.competencia ?? competenciaAtual());
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | undefined>(salvo.usuarioId);
  const [filtroClienteId, setFiltroClienteId] = useState<number | undefined>(salvo.clienteId);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [fotoVisualizada, setFotoVisualizada] = useState<PontoLancamento | null>(null);
  const [lancamentos, setLancamentos] = useState<PontoLancamento[]>([]);
  const [resumo, setResumo] = useState<PontoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PontoLancamento | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([api.get('/usuarios'), api.get('/clientes')])
      .then(([u, c]) => {
        setUsuarios(u.data as Usuario[]);
        setClientes(c.data as Cliente[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    salvarFiltrosPonto('marcacoes', {
      competencia,
      usuarioId: filtroUsuarioId,
      clienteId: filtroClienteId,
    });
  }, [competencia, filtroUsuarioId, filtroClienteId]);

  useEffect(() => {
    setSelectedDay(null);
  }, [competencia]);

  const carregar = useCallback(async (silent = false) => {
    const [ano, mes] = competencia.split('-').map(Number);
    const params: Record<string, number> = { ano, mes };
    if (filtroUsuarioId) params.usuario_id = filtroUsuarioId;
    if (filtroClienteId) params.cliente_id = filtroClienteId;

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [lancRes, resumoRes] = await Promise.all([
        api.get('/ponto-eletronico/lancamentos', { params }),
        api.get('/ponto-eletronico/resumo', { params }),
      ]);
      setLancamentos(Array.isArray(lancRes.data) ? lancRes.data as PontoLancamento[] : []);
      setResumo(Array.isArray(resumoRes.data) ? resumoRes.data as PontoResumo[] : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar o ponto eletronico';
      if (!silent) addToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [competencia, filtroUsuarioId, filtroClienteId, addToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totais = useMemo(() => {
    return resumo.reduce((acc, item) => ({
      base: acc.base + (item.horasBase || 0),
      trabalhadas: acc.trabalhadas + (item.horasTrabalhadas || 0),
      abatidas: acc.abatidas + (item.horasAbatidas || 0),
      excedentes: acc.excedentes + (item.deltaHoras || 0),
      valor: acc.valor + (item.deltaHoras || 0) * (item.valorHora || 0),
    }), { base: 0, trabalhadas: 0, abatidas: 0, excedentes: 0, valor: 0 });
  }, [resumo]);

  const horasPorDia = useMemo(() => calcularHorasPorDia(lancamentos), [lancamentos]);

  const calendarDate = useMemo(() => {
    const [y, m] = competencia.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }, [competencia]);

  const feriados = useMemo(() => getFeriadosBrasil(calendarDate.getFullYear()), [calendarDate]);
  const feriadosMap = useMemo(() => new Map(feriados.map((f) => [f.date, f.nome])), [feriados]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const startPad = new Date(year, month, 1).getDay();
    const days: { day: number; date: string; horas?: { horas: number; valor: number }; isWeekend?: boolean; isSunday?: boolean; isFeriado?: boolean; nomeFeriado?: string }[] = [];

    for (let i = 0; i < startPad; i++) {
      days.push({ day: 0, date: '' });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const nomeFeriado = feriadosMap.get(dateStr);
      days.push({
        day: d,
        date: dateStr,
        horas: horasPorDia[dateStr],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isFeriado: !!nomeFeriado,
        nomeFeriado,
      });
    }
    return days;
  }, [calendarDate, horasPorDia, feriadosMap]);

  const chartData = useMemo(() => {
    return Object.entries(horasPorDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        dia: date.split('-')[2],
        valor: data.valor,
      }));
  }, [horasPorDia]);

  const lancamentosFiltrados = useMemo(
    () => (selectedDay ? lancamentos.filter((l) => l.dataServico.split('T')[0] === selectedDay) : lancamentos),
    [lancamentos, selectedDay],
  );

  const prevMonth = () => {
    const [y, m] = competencia.split('-').map(Number);
    const nova = new Date(y, m - 2, 1);
    setCompetencia(`${nova.getFullYear()}-${String(nova.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [y, m] = competencia.split('-').map(Number);
    const nova = new Date(y, m, 1);
    setCompetencia(`${nova.getFullYear()}-${String(nova.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleDayClick = (date: string) => {
    if (!date) return;
    setSelectedDay((prev) => (prev === date ? null : date));
  };

  const handleEdit = (item: PontoLancamento) => {
    const id = item.id ?? item.codigo;
    if (!id) return;
    setEditing(item);
    setEditingId(id);
    setModalOpen(true);
  };

  const handleSubmit = async (data: PontoLancamento) => {
    const isEdit = !!editingId;
    try {
      await api.post('/ponto-eletronico/lancamentos', data);
      setModalOpen(false);
      setEditing(null);
      setEditingId(null);
      await carregar(true);
      addToast('success', isEdit ? 'Marcacao atualizada com sucesso' : 'Marcacao cadastrada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar marcacao';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await api.delete('/ponto-eletronico/lancamentos', { params: { id: confirmDelete } });
      setConfirmDelete(null);
      await carregar(true);
      addToast('success', 'Marcacao excluida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir marcacao';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
    setEditingId(null);
  };

  const columns = [
    lancamentoColumns.accessor('dataServico', {
      header: 'Data',
      cell: (info) => formatDate(info.getValue()),
      enableSorting: true,
    }),
    lancamentoColumns.accessor('horaLancamento', {
      header: 'Hora',
      enableSorting: true,
    }),
    lancamentoColumns.accessor('tipoLancamento', {
      header: 'Tipo',
      cell: (info) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          info.getValue() === 'E'
            ? 'bg-green-500/10 text-green-600'
            : 'bg-orange-500/10 text-orange-600'
        }`}>
          {info.getValue() === 'E' ? 'Entrada' : 'Saida'}
        </span>
      ),
      enableSorting: true,
    }),
    lancamentoColumns.accessor('usuarioNome', {
      header: 'Usuario',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    lancamentoColumns.accessor('clienteNome', {
      header: 'Cliente',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    lancamentoColumns.accessor('servicoNome', {
      header: 'Servico',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    lancamentoColumns.display({
      id: 'local',
      header: 'Local',
      enableColumnFilter: false,
      cell: ({ row }) => {
        const { latitude, longitude } = row.original;
        if (latitude == null || longitude == null) return <span className="text-text-muted">-</span>;
        return (
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-accent-primary hover:underline"
            title={`${latitude}, ${longitude}`}
          >
            <MapPin size={14} /> Mapa
          </a>
        );
      },
    }),
    lancamentoColumns.display({
      id: 'foto',
      header: 'Foto',
      enableColumnFilter: false,
      cell: ({ row }) => (
        row.original.foto ? (
          <button type="button" onClick={() => setFotoVisualizada(row.original)} title="Ver foto">
            <img src={row.original.foto} alt="Foto" className="w-8 h-8 rounded object-cover border border-border-subtle" />
          </button>
        ) : (
          <span className="text-text-muted">-</span>
        )
      ),
    }),
    lancamentoColumns.accessor('observacoes', {
      header: 'Observacoes',
      cell: (info) => info.getValue() || '-',
    }),
    lancamentoColumns.display({
      id: 'acoes',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 60,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            rota="/ponto-eletronico"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo ?? null)}
          />
        </div>
      ),
    }),
  ];

  const columnsResumo = [
    resumoColumns.accessor('usuarioNome', {
      header: 'Usuario',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    resumoColumns.accessor('clienteNome', {
      header: 'Cliente',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    resumoColumns.accessor('servicoNome', {
      header: 'Servico',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    resumoColumns.accessor('horasBase', {
      header: 'Base',
      cell: (info) => formatHoras(Number(info.getValue())),
      meta: { align: 'right' } as Record<string, string>,
      enableSorting: true,
    }),
    resumoColumns.accessor('horasTrabalhadas', {
      header: 'Trabalhadas',
      cell: (info) => formatHoras(Number(info.getValue())),
      meta: { align: 'right' } as Record<string, string>,
      enableSorting: true,
    }),
    resumoColumns.accessor('horasAbatidas', {
      header: 'Abatidas',
      cell: (info) => formatHoras(Number(info.getValue())),
      meta: { align: 'right' } as Record<string, string>,
      enableSorting: true,
    }),
    resumoColumns.accessor('deltaHoras', {
      header: 'Excedente',
      cell: (info) => (
        <span className={Number(info.getValue()) > 0 ? 'font-semibold text-accent-red' : ''}>
          {formatHoras(Number(info.getValue()))}
        </span>
      ),
      meta: { align: 'right' } as Record<string, string>,
      enableSorting: true,
    }),
    resumoColumns.display({
      id: 'valor',
      header: 'Valor Acumulado',
      cell: ({ row }) => formatCurrency((row.original.deltaHoras || 0) * (row.original.valorHora || 0)),
      meta: { align: 'right' } as Record<string, string>,
    }),
  ];

  return (
    <Layout>
      <PageHeader title="Ponto Eletrônico" subtitle="Marcacoes de entrada e saida com fechamento mensal">
        <input
          type="month"
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="h-9 rounded-lg border border-border-primary bg-background-primary px-3 text-sm text-text-primary"
        />
        <RegistroSelect<number>
          value={filtroUsuarioId ?? null}
          onChange={(v) => setFiltroUsuarioId(v)}
          onClear={() => setFiltroUsuarioId(undefined)}
          options={usuarios.map((u) => ({ value: (u.id ?? u.codigo)!, label: u.nome }))}
          title="Filtro por Usuario"
          placeholder="Todos os usuarios"
        />
        <RegistroSelect<number>
          value={filtroClienteId ?? null}
          onChange={(v) => setFiltroClienteId(v)}
          onClear={() => setFiltroClienteId(undefined)}
          options={clientes.map((c) => ({ value: (c.id ?? c.codigo)!, label: c.nome }))}
          title="Filtro por Cliente"
          placeholder="Todos os clientes"
        />
        <ShowForPermission rota="/ponto-eletronico" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setEditingId(null); setModalOpen(true); }}>
            <Plus size={18} /> Nova Marcacao
          </Button>
        </ShowForPermission>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Timer size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Base Mensal</p>
              <p className="text-2xl font-bold text-foreground-primary">{formatHoras(totais.base)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-500/10">
              <Clock size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Horas Trabalhadas</p>
              <p className="text-2xl font-bold text-foreground-primary">{formatHoras(totais.trabalhadas)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Minus size={24} className="text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Horas Abatidas</p>
              <p className="text-2xl font-bold text-foreground-primary">{formatHoras(totais.abatidas)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/10">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Horas Excedentes</p>
              <p className="text-2xl font-bold text-foreground-primary">{formatHoras(totais.excedentes)}</p>
              <p className="text-xs text-text-muted">{formatCurrency(totais.valor)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <DollarSign size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Valor Acumulado no Mes</p>
              <p className="text-2xl font-bold text-foreground-primary">{formatCurrency(totais.valor)}</p>
              <p className="text-xs text-text-muted">{resumo.length} servico(s)</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground-primary">Fechamento Mensal</h2>
            <p className="text-sm text-text-secondary">Excedente = trabalhadas - abatidas - base do servico</p>
          </div>
          <button
            onClick={() => carregar(true)}
            className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
            title="Recalcular"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={`text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <DataTable
          columns={columnsResumo}
          data={resumo}
          loading={loading}
          emptyMessage="Nenhum fechamento encontrado para o periodo"
        />
        <div className="flex flex-wrap items-center justify-end gap-6 mt-4 pt-4 border-t border-border-subtle">
          <div className="text-sm text-text-secondary">
            Base: <span className="font-semibold text-text-primary">{formatHoras(totais.base)}</span>
          </div>
          <div className="text-sm text-text-secondary">
            Trabalhadas: <span className="font-semibold text-text-primary">{formatHoras(totais.trabalhadas)}</span>
          </div>
          <div className="text-sm text-text-secondary">
            Abatidas: <span className="font-semibold text-text-primary">{formatHoras(totais.abatidas)}</span>
          </div>
          <div className="text-sm text-text-secondary">
            Excedentes: <span className="font-semibold text-text-primary">{formatHoras(totais.excedentes)}</span>
          </div>
          <div className="text-sm text-text-secondary">
            Valor Acumulado: <span className="font-semibold text-accent-primary">{formatCurrency(totais.valor)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <User size={18} className="text-text-secondary" />
            <h2 className="text-lg font-semibold text-foreground-primary">Marcacoes</h2>
            {selectedDay && (
              <button
                onClick={() => setSelectedDay(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-primary/10 text-xs font-medium text-accent-primary hover:bg-accent-primary/20"
                title="Limpar filtro do dia"
              >
                Dia {formatDate(selectedDay)} <Minus size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => carregar(true)}
            className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
            title="Atualizar"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={`text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <DataTable
          columns={columns}
          data={lancamentosFiltrados}
          loading={loading}
          emptyMessage="Nenhuma marcacao cadastrada no periodo"
        />
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-text-secondary" />
              <h2 className="text-lg font-semibold text-foreground-primary">
                {MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
                title="Mes anterior"
              >
                <ChevronLeft size={16} className="text-text-secondary" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
                title="Proximo mes"
              >
                <ChevronRight size={16} className="text-text-secondary" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-text-muted py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => (
              <div
                key={`${item.date || 'empty'}-${idx}`}
                onClick={() => handleDayClick(item.date)}
                className={`min-h-[74px] rounded-lg border p-1.5 transition-colors ${
                  item.day === 0
                    ? 'border-transparent'
                    : item.isFeriado
                      ? 'border-red-500/20 bg-red-500/5'
                      : item.isSunday
                        ? 'border-border-primary bg-background-secondary/40'
                        : item.isWeekend
                          ? 'border-border-primary bg-background-secondary/20'
                          : 'border-border-primary bg-background-primary'
                } ${item.date && item.date === selectedDay ? 'ring-2 ring-accent-primary' : ''} ${item.day > 0 ? 'cursor-pointer hover:border-accent-primary' : ''}`}
                title={item.nomeFeriado || undefined}
              >
                {item.day > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${
                        item.isFeriado ? 'text-red-500' : item.isSunday ? 'text-text-muted' : 'text-text-secondary'
                      }`}>
                        {item.day}
                      </span>
                      {item.horas && item.horas.horas > 0 && (
                        <span className="text-[10px] font-bold text-green-600">{formatHoras(item.horas.horas)}</span>
                      )}
                    </div>
                    {item.horas && item.horas.horas > 0 && (
                      <p className="text-[10px] text-text-muted mt-0.5">{formatCurrency(item.horas.valor)}</p>
                    )}
                    {item.nomeFeriado && (
                      <p className="text-[9px] text-red-500/80 truncate mt-0.5">{item.nomeFeriado}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground-primary">Valor Diario</h2>
            <p className="text-sm text-text-secondary">Valores acumulados por dia no mes</p>
          </div>
          {chartData.length === 0 ? (
            <p className="text-sm text-text-muted py-12 text-center">Sem marcacoes no periodo</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary, #e5e7eb)" opacity={0.4} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v))} width={90} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-background-primary, #fff)', border: '1px solid var(--color-border-primary, #e5e7eb)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number | string) => [formatCurrency(Number(value)), 'Valor']}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Marcacao' : 'Nova Marcacao'}>
        <PontoLancamentoForm
          key={`ponto-form-${editingId ?? 'new'}`}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          initial={editing}
          editingId={editingId}
        />
      </Modal>

      <Modal
        isOpen={fotoVisualizada !== null}
        onClose={() => setFotoVisualizada(null)}
        title="Foto da Marcacao"
      >
        {fotoVisualizada && (
          <div className="space-y-3">
            <img src={fotoVisualizada.foto ?? ''} alt="Foto da marcacao" className="w-full rounded-lg border border-border-subtle" />
            <div className="text-sm text-text-secondary space-y-1">
              <p><span className="font-medium text-text-primary">Usuario:</span> {fotoVisualizada.usuarioNome || '-'}</p>
              <p><span className="font-medium text-text-primary">Data:</span> {formatDate(fotoVisualizada.dataServico)} {fotoVisualizada.horaLancamento}</p>
              {fotoVisualizada.latitude != null && fotoVisualizada.longitude != null && (
                <a
                  href={`https://www.google.com/maps?q=${fotoVisualizada.latitude},${fotoVisualizada.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent-primary hover:underline"
                >
                  <MapPin size={14} /> Ver local no mapa
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Marcacao"
        message="Tem certeza que deseja excluir esta marcacao? O fechamento do mes sera recalculado."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
