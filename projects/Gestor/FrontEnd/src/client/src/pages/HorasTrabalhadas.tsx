import { useState, useMemo, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { HoraTrabalhadaForm } from '@/components/forms/HoraTrabalhadaForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate, ceilTo2 } from '@/lib/utils';
import type { HoraTrabalhada, Cliente, Usuario, Servico, HoraAbatida, HoraExcedida } from '@/types';
import type { HoraTrabalhadaInput } from '@/schemas';
import api from '@/lib/api';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, Clock, DollarSign, CalendarDays, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Users, User, Wrench, FileDown } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from '@/lib/pdf';

const columnHelper = createColumnHelper<HoraTrabalhada>();

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
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

function formatTime(timeStr: string): string {
  if (!timeStr) return '-';
  if (typeof timeStr !== 'string') return String(timeStr);
  return timeStr.substring(0, 5);
}

function toYYYYMMDD(dateStr: string): string {
  return dateStr.split('T')[0];
}

function formatHoras(decimal: number): string {
  if (!decimal) return '00:00:00';
  const abs = Math.abs(decimal);
  const totalSeconds = Math.round(abs * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return decimal < 0 ? `-${formatted}` : formatted;
}

function calcHoras(inicio: string, termino: string): number {
  if (!inicio || !termino) return 0;
  const [hI, mI] = inicio.split(':').map(Number);
  const [hT, mT] = termino.split(':').map(Number);
  const minInicio = hI * 60 + mI;
  const minTermino = hT * 60 + mT;
  if (minTermino > minInicio) {
    return (minTermino - minInicio) / 60;
  }
  return (1440 - minInicio + minTermino) / 60;
}

const FILTER_KEY = 'horas_trabalhadas_filtros';

interface FilterState {
  dataInicio: string;
  dataFim: string;
  usuarioId: number | undefined;
  clienteId: number | undefined;
  servicoId: number | undefined;
}

function loadFilters(): FilterState {
  const defaults: FilterState = {
    dataInicio: (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; })(),
    dataFim: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().split('T')[0]; })(),
    usuarioId: undefined,
    clienteId: undefined,
    servicoId: undefined,
  };
  try {
    const saved = localStorage.getItem(FILTER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveFilters(filters: FilterState) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
}

export function HorasTrabalhadas() {
  const { data: horas, loading, error, create, update, remove, fetchOne, refetch } = useApi<HoraTrabalhada>('/horas-trabalhadas');
  const { data: abatimentos, error: abatimentosError, refetch: refetchAbatimentos } = useApi<HoraAbatida>('/horas-abatidas');
  const { data: excedidas } = useApi<HoraExcedida>('/horas-excedidas');

  useEffect(() => {
    console.log('[HorasTrabalhadas] abatimentos recebidos:', abatimentos?.length, 'error:', abatimentosError, abatimentos?.[0]);
  }, [abatimentos, abatimentosError]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HoraTrabalhada | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [lastEntry, setLastEntry] = useState<HoraTrabalhada | null>(null);
  const [newEntryCount, setNewEntryCount] = useState(0);
  const [focusDate, setFocusDate] = useState(false);

  useEffect(() => {
    if (focusDate) {
      const timer = setTimeout(() => setFocusDate(false), 100);
      return () => clearTimeout(timer);
    }
  }, [focusDate]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  const savedFilters = useMemo(() => loadFilters(), []);

  const [dataInicio, setDataInicio] = useState(savedFilters.dataInicio);
  const [dataFim, setDataFim] = useState(savedFilters.dataFim);
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | undefined>(savedFilters.usuarioId);
  const [filtroClienteId, setFiltroClienteId] = useState<number | undefined>(savedFilters.clienteId);
  const [filtroServicoId, setFiltroServicoId] = useState<number | undefined>(savedFilters.servicoId);

  useEffect(() => {
    Promise.all([api.get('/clientes'), api.get('/usuarios'), api.get('/servicos')]).then(([c, u, s]) => {
      setClientes(c.data as Cliente[]);
      setUsuarios(u.data as Usuario[]);
      setServicos(s.data as Servico[]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    saveFilters({ dataInicio, dataFim, usuarioId: filtroUsuarioId, clienteId: filtroClienteId, servicoId: filtroServicoId });
  }, [dataInicio, dataFim, filtroUsuarioId, filtroClienteId, filtroServicoId]);

  const [calendarDate, setCalendarDate] = useState(() => {
    const [y, m] = savedFilters.dataInicio.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const [y, m] = dataInicio.split('-').map(Number);
    setCalendarDate(new Date(y, m - 1, 1));
  }, [dataInicio]);

  const horasFiltradas = useMemo(() => {
    if (!horas) return [];
    const inicio = new Date(dataInicio + 'T00:00:00');
    const fim = new Date(dataFim + 'T23:59:59');
    return horas.filter((h) => {
      const raw = h.dataServico.split('T')[0];
      const d = new Date(raw + 'T12:00:00');
      if (d < inicio || d > fim) return false;
      if (selectedDay && raw !== selectedDay) return false;
      if (filtroUsuarioId && h.usuarioId !== filtroUsuarioId) return false;
      if (filtroClienteId && h.clienteId !== filtroClienteId) return false;
      return true;
    });
  }, [horas, dataInicio, dataFim, selectedDay, filtroUsuarioId, filtroClienteId]);

  const totalHoras = useMemo(() =>
    horasFiltradas.reduce((acc, h) => acc + (h.quantidadeHoras ?? calcHoras(h.horaInicio, h.horaTermino)), 0),
    [horasFiltradas]
  );

  const totalValor = useMemo(() =>
    horasFiltradas.reduce((acc, h) => acc + (h.totalHoras ?? (h.quantidadeHoras ?? calcHoras(h.horaInicio, h.horaTermino)) * Number(h.valorHora)), 0),
    [horasFiltradas]
  );

  const horasPorDia = useMemo(() => {
    const map: Record<string, { horas: number; valor: number }> = {};
    horasFiltradas.forEach((h) => {
      const key = toYYYYMMDD(h.dataServico);
      const qtd = h.quantidadeHoras ?? calcHoras(h.horaInicio, h.horaTermino);
      const total = h.totalHoras ?? ceilTo2(qtd * Number(h.valorHora));
      if (!map[key]) map[key] = { horas: 0, valor: 0 };
      map[key].horas += qtd;
      map[key].valor += total;
    });
    return map;
  }, [horasFiltradas]);

  const diasComLancamentos = useMemo(() => {
    const dias = new Set(horasFiltradas.map((h) => toYYYYMMDD(h.dataServico)));
    return dias.size;
  }, [horasFiltradas]);

  const chartData = useMemo(() => {
    return Object.entries(horasPorDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        dia: date.split('-')[2],
        valor: data.valor,
      }));
  }, [horasPorDia]);

  const servicoSelecionado = useMemo(() => {
    if (!filtroServicoId) return undefined;
    return servicos.find((s) => (s.id ?? s.codigo) === filtroServicoId);
  }, [filtroServicoId, servicos]);

  const parseIntervalToDecimal = (iv: string): number => {
    const match = iv.match(/(\d+):(\d+):(\d+)/);
    if (!match) return 0;
    return Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600;
  };

  const diferencaHoras = useMemo(() => {
    if (!servicoSelecionado) return null;
    const minDec = parseIntervalToDecimal(servicoSelecionado.horasMinimas);
    if (minDec <= 0) return null;
    return totalHoras - minDec;
  }, [totalHoras, servicoSelecionado]);

  const abatimentosFiltrados = useMemo(() => {
    if (!abatimentos) return [];
    const inicio = new Date(dataInicio + 'T00:00:00');
    const fim = new Date(dataFim + 'T23:59:59');
    console.log('[HorasTrabalhadas] filtrando abatimentos:', { total: abatimentos.length, dataInicio, dataFim, inicio: inicio.toISOString(), fim: fim.toISOString() });
    if (abatimentos.length > 0) {
      console.log('[HorasTrabalhadas] primeiro abatimento dataAbatimento:', abatimentos[0].dataAbatimento, typeof abatimentos[0].dataAbatimento);
    }
    return abatimentos.filter((a) => {
      const raw = a.dataAbatimento.split('T')[0];
      const d = new Date(raw + 'T12:00:00');
      if (d < inicio || d > fim) return false;
      if (filtroUsuarioId && a.usuarioId !== filtroUsuarioId) return false;
      if (filtroClienteId && a.clienteId !== filtroClienteId) return false;
      if (filtroServicoId && a.servicoId !== filtroServicoId) return false;
      return true;
    });
  }, [abatimentos, dataInicio, dataFim, filtroUsuarioId, filtroClienteId, filtroServicoId]);

  const totalAbatidoValor = useMemo(() =>
    abatimentosFiltrados.reduce((acc, a) => acc + a.valor, 0),
    [abatimentosFiltrados]
  );

  const totalAbatidoHoras = useMemo(() =>
    abatimentosFiltrados.reduce((acc, a) => acc + a.quantidadeHoras, 0),
    [abatimentosFiltrados]
  );

  const saldoAcumulado = useMemo(() => {
    if (!excedidas || !dataInicio) return 0;
    const [y, m] = dataInicio.split('-').map(Number);
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    const record = excedidas.find((e) => {
      if (filtroUsuarioId && e.usuarioId !== filtroUsuarioId) return false;
      if (filtroClienteId && e.clienteId !== filtroClienteId) return false;
      if (filtroServicoId && e.servicoId !== filtroServicoId) return false;
      return e.anoOrigem === prevYear && e.mesOrigem === prevMonth;
    });
    return record ? record.deltaHoras : 0;
  }, [excedidas, filtroUsuarioId, filtroClienteId, filtroServicoId, dataInicio]);

  const saldoAcumuladoValor = useMemo(() => {
    if (saldoAcumulado === 0) return 0;
    if (servicoSelecionado) {
      return ceilTo2(saldoAcumulado * Number(servicoSelecionado.valorHora));
    }
    if (horasFiltradas.length > 0) {
      const totalCents = horasFiltradas.reduce((acc, h) => {
        const qtd = h.quantidadeHoras ?? calcHoras(h.horaInicio, h.horaTermino);
        const total = h.totalHoras ?? ceilTo2(qtd * Number(h.valorHora));
        const rate = qtd > 0 ? ceilTo2(total / qtd) : 0;
        return acc + rate;
      }, 0);
      const avgRate = horasFiltradas.length > 0 ? totalCents / horasFiltradas.length : 0;
      return ceilTo2(saldoAcumulado * avgRate);
    }
    return 0;
  }, [saldoAcumulado, servicoSelecionado, horasFiltradas]);

  const saldoFinal = useMemo(() => totalHoras + saldoAcumulado, [totalHoras, saldoAcumulado]);

  const saldoFinalValor = useMemo(() => {
    const saldo = totalHoras + saldoAcumulado;
    if (saldo === 0) return 0;
    if (servicoSelecionado) {
      return ceilTo2(saldo * Number(servicoSelecionado.valorHora));
    }
    if (horasFiltradas.length > 0) {
      const totalCents = horasFiltradas.reduce((acc, h) => {
        const qtd = h.quantidadeHoras ?? calcHoras(h.horaInicio, h.horaTermino);
        const total = h.totalHoras ?? ceilTo2(qtd * Number(h.valorHora));
        const rate = qtd > 0 ? ceilTo2(total / qtd) : 0;
        return acc + rate;
      }, 0);
      const avgRate = horasFiltradas.length > 0 ? totalCents / horasFiltradas.length : 0;
      return ceilTo2(saldo * avgRate);
    }
    return 0;
  }, [totalHoras, saldoAcumulado, servicoSelecionado, horasFiltradas]);

  const feriados = useMemo(() => getFeriadosBrasil(calendarDate.getFullYear()), [calendarDate]);
  const feriadosMap = useMemo(() => new Map(feriados.map((f) => [f.date, f.nome])), [feriados]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: { day: number; date: string; horas?: { horas: number; valor: number }; isWeekend?: boolean; isSunday?: boolean; isFeriado?: boolean; nomeFeriado?: string }[] = [];

    for (let i = 0; i < startPad; i++) {
      days.push({ day: 0, date: '' });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;
      const nomeFeriado = feriadosMap.get(dateStr);
      days.push({
        day: d,
        date: dateStr,
        horas: horasPorDia[dateStr],
        isWeekend,
        isSunday,
        isFeriado: !!nomeFeriado,
        nomeFeriado,
      });
    }
    return days;
  }, [calendarDate, horasPorDia, feriadosMap]);

  const columns = [
    columnHelper.accessor('dataServico', {
      header: 'Data',
      cell: (info) => formatDate(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor((row) => `${formatTime(row.horaInicio)} - ${formatTime(row.horaTermino)}`, {
      id: 'horario',
      header: 'Horario',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.quantidadeHoras ?? calcHoras(row.horaInicio, row.horaTermino), {
      id: 'quantidadeHoras',
      header: 'Horas',
      cell: (info) => formatHoras(Number(info.getValue())),
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('valorHora', {
      header: 'Valor/Hora',
      cell: (info) => formatCurrency(Number(info.getValue())),
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor((row) => row.totalHoras ?? (row.quantidadeHoras ?? calcHoras(row.horaInicio, row.horaTermino)) * Number(row.valorHora), {
      id: 'totalHoras',
      header: 'Total',
      cell: (info) => formatCurrency(info.getValue()),
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('observacoes', {
      header: 'Observacoes',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.display({
      id: 'acoes',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 60,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            rota="/horas-trabalhadas"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (hora: HoraTrabalhada) => {
    const idToFetch = hora.id || hora.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? hora);
    } catch {
      setEditing(hora);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: HoraTrabalhadaInput) => {
    try {
      const payload: HoraTrabalhada = {
        ...data,
        clienteId: data.clienteId || undefined,
        servicoId: data.servicoId || undefined,
      };
      if (editing) {
        await update({ ...payload, id: editing.id ?? editing.codigo });
        setModalOpen(false);
        setEditing(null);
        addToast('success', 'Hora trabalhada atualizada com sucesso');
      } else {
        await create(payload);
        setLastEntry({ ...payload, observacoes: '' });
        setNewEntryCount((c) => c + 1);
        setFocusDate(true);
        addToast('success', 'Hora trabalhada cadastrada com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar hora trabalhada';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Hora trabalhada excluida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir hora trabalhada';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const handleDayClick = (date: string) => {
    if (!date) return;
    setSelectedDay((prev) => (prev === date ? null : date));
  };

  const [showConfirmPdf, setShowConfirmPdf] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof buildPDFWithHeader> | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');

  const handleExportPdf = useCallback(() => {
    const filename = `horas-trabalhadas-${new Date().toISOString().split('T')[0]}.pdf`;
    const usuarioSelecionado = filtroUsuarioId ? usuarios.find((u) => (u.id ?? u.codigo) === filtroUsuarioId) : undefined;
    const clienteSelecionado = filtroClienteId ? clientes.find((c) => (c.id ?? c.codigo) === filtroClienteId) : undefined;
    const servicoSelecionadoFiltro = filtroServicoId ? servicos.find((s) => (s.id ?? s.codigo) === filtroServicoId) : undefined;

    const filtros: string[] = [
      `Periodo: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
      usuarioSelecionado ? `Usuario: ${usuarioSelecionado.nome}` : 'Usuarios: Todos',
      clienteSelecionado ? `Cliente: ${clienteSelecionado.nome}` : 'Clientes: Todos',
      servicoSelecionadoFiltro ? `Servico: ${servicoSelecionadoFiltro.nome}` : 'Servicos: Todos',
    ];

    const doc = buildPDFWithHeader(
      {
        title: 'Horas Trabalhadas',
        emissionDate: new Date().toLocaleDateString('pt-BR'),
        filters: filtros,
        filtersLines: [
          [
            `Periodo: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
            usuarioSelecionado ? `Usuario: ${usuarioSelecionado.nome}` : 'Usuarios: Todos',
          ],
          [
            clienteSelecionado ? `Cliente: ${clienteSelecionado.nome}` : 'Clientes: Todos',
            servicoSelecionadoFiltro ? `Servico: ${servicoSelecionadoFiltro.nome}` : 'Servicos: Todos',
          ],
        ],
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        let y = 42;

        const pageWidth = d.internal.pageSize.getWidth();
        const margin = 14;
        const cardX = margin;
        const cardPadding = 4;
        const cardLineH = 5;
        const titleLineH = 9;
        const cardStartY = y - 3;

        d.setFontSize(9);
        d.setFont('helvetica', 'normal');

        const resumoItems: [string, string][] = [
          ['Total Horas Trabalhadas', formatHoras(totalHoras)],
          ['Valor Total', formatCurrency(totalValor - totalAbatidoValor)],
          ['Media Diaria', diasComLancamentos > 0 ? formatHoras(totalHoras / diasComLancamentos) : '00:00:00'],
        ];
        if (diferencaHoras !== null) {
          resumoItems.push(['Saldo Horas', `${diferencaHoras >= 0 ? '+' : ''}${formatHoras(diferencaHoras)}`]);
        }
        if (servicoSelecionado) {
          resumoItems.push(['Valor/Hora (Servico)', formatCurrency(servicoSelecionado.valorHora)]);
          resumoItems.push(['Horas Minimas (Servico)', servicoSelecionado.horasMinimas]);
        }

        const cardHeight = titleLineH + resumoItems.length * cardLineH + cardPadding + 2;
        d.setFillColor(235, 235, 235);
        d.setDrawColor(180, 180, 180);
        d.setLineWidth(0.3);
        d.roundedRect(cardX, cardStartY, pageWidth - margin * 2, cardHeight, 2, 2, 'FD');

        d.setFontSize(11);
        d.setFont('helvetica', 'bold');
        d.setTextColor(0);
        d.text('Resumo', cardX + cardPadding, y + 4);
        y += titleLineH;

        d.setFontSize(9);
        d.setFont('helvetica', 'normal');

        resumoItems.forEach(([label, value]) => {
          d.setTextColor(80);
          d.text(label, cardX + cardPadding, y);
          d.setTextColor(0);
          d.setFont('helvetica', 'bold');
          const valueWidth = d.getStringUnitWidth(value) * d.getFontSize() / d.internal.scaleFactor;
          d.text(value, pageWidth - margin - cardPadding - valueWidth, y);
          d.setFont('helvetica', 'normal');
          y += cardLineH;
        });

        y += 8;
        d.setFontSize(11);
        d.setFont('helvetica', 'bold');
        d.setTextColor(0);
        d.text('Lancamentos', 14, y);
        y += 2;

        const calcHeaderHeight = (options: { filtersLines?: string[][] }) => {
          const lineHeight1 = 6;
          const lineHeight2 = 5;
          const lineHeight3 = 4;
          let extraLines = 0;
          if (options.filtersLines && options.filtersLines.length > 0) {
            extraLines = options.filtersLines.length;
          }
          return 8 + lineHeight1 + lineHeight2 + lineHeight3 + (extraLines > 0 ? extraLines * 4 + 3 : 4 + 3);
        };

        const headerHeight = calcHeaderHeight({
          filtersLines: [
            [
              `Periodo: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
              usuarioSelecionado ? `Usuario: ${usuarioSelecionado.nome}` : 'Usuarios: Todos',
            ],
            [
              clienteSelecionado ? `Cliente: ${clienteSelecionado.nome}` : 'Clientes: Todos',
              servicoSelecionadoFiltro ? `Servico: ${servicoSelecionadoFiltro.nome}` : 'Servicos: Todos',
            ],
          ],
        });

        const tblWidth = pageWidth - 20;
        const obsWidth = tblWidth / 2;
        const otherWidth = (tblWidth - obsWidth) / 5;
        autoTable(d, {
          head: [['Data', 'Horario', 'Horas', 'Valor/Hora', 'Total', 'Observacoes']],
          body: horasFiltradas.map((h) => {
            const qtd = h.quantidadeHoras ?? calcHoras(h.horaInicio, h.horaTermino);
            const total = h.totalHoras ?? qtd * Number(h.valorHora);
            return [
              formatDate(h.dataServico),
              `${formatTime(h.horaInicio)} - ${formatTime(h.horaTermino)}`,
              formatHoras(qtd),
              formatCurrency(Number(h.valorHora)),
              formatCurrency(total),
              h.observacoes || '-',
            ];
          }),
          startY: y,
          showHead: 'everyPage',
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94], cellPadding: 2 },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: otherWidth, halign: 'left' },
            1: { cellWidth: otherWidth, halign: 'left' },
            2: { cellWidth: otherWidth, halign: 'left' },
            3: { cellWidth: otherWidth, halign: 'right' },
            4: { cellWidth: otherWidth, halign: 'right' },
            5: { cellWidth: obsWidth, halign: 'left' },
          },
          didParseCell: (data) => {
            if (data.section === 'head' && (data.column.index === 3 || data.column.index === 4)) {
              data.cell.styles.halign = 'right';
            }
          },
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = headerHeight;
            }
          },
        });
      }
    );

    setPdfDoc(doc);
    setPdfFilename(filename);
    setShowConfirmPdf(true);
  }, [horasFiltradas, totalHoras, totalValor, diasComLancamentos, diferencaHoras, servicoSelecionado, dataInicio, dataFim, filtroUsuarioId, filtroClienteId, filtroServicoId, usuarios, clientes, servicos]);

  return (
    <Layout>
      <PageHeader title="Horas Trabalhadas" subtitle="Gerencie horas trabalhadas">
        <ShowForPermission rota="/horas-trabalhadas" acao={ACAO.EXPORTAR}>
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw size={18} /> Atualizar
          </Button>
        </ShowForPermission>
        <ShowForPermission rota="/horas-trabalhadas" acao={ACAO.EXPORTAR}>
          <Button variant="secondary" onClick={handleExportPdf}>
            <FileDown size={18} /> Gerar PDF
          </Button>
        </ShowForPermission>
        <ShowForPermission rota="/horas-trabalhadas" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Nova Hora
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-text-secondary" />
            <span className="text-sm font-medium text-text-secondary">Periodo:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">De:</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  const val = e.target.value;
                  setDataInicio(val);
                  const [y, m] = val.split('-').map(Number);
                  const lastDay = new Date(y, m, 0).getDate();
                  setDataFim(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
                }}
                className="px-3 py-1.5 rounded-lg border border-border-primary bg-bg-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">Ate:</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border-primary bg-bg-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <User size={16} className="text-text-secondary" />
            <label className="text-sm text-text-secondary">Usuario:</label>
            <RegistroSelect<number>
              value={filtroUsuarioId ?? null}
              onChange={(v) => setFiltroUsuarioId(v)}
              options={usuarios.map((u) => ({ value: (u.id ?? u.codigo)!, label: u.nome }))}
              title="Filtro por Usuario"
              placeholder="Todos os usuarios"
            />
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-text-secondary" />
            <label className="text-sm text-text-secondary">Cliente:</label>
            <RegistroSelect<number>
              value={filtroClienteId ?? null}
              onChange={(v) => setFiltroClienteId(v)}
              options={clientes.map((c) => ({ value: (c.id ?? c.codigo)!, label: c.nome }))}
              title="Filtro por Cliente"
              placeholder="Todos os clientes"
            />
          </div>
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-text-secondary" />
            <label className="text-sm text-text-secondary">Servico:</label>
            <RegistroSelect<number>
              value={filtroServicoId ?? null}
              onChange={(v) => setFiltroServicoId(v)}
              options={servicos.map((s) => ({ value: (s.id ?? s.codigo)!, label: s.nome }))}
              title="Filtro por Servico"
              placeholder="Todos os servicos"
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 mb-6">
        <Card className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${saldoAcumulado >= 0 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
              <TrendingUp size={18} className={saldoAcumulado >= 0 ? 'text-amber-500' : 'text-red-500'} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Saldo Acumulado</p>
              <p className={`text-lg font-bold ${saldoAcumulado >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                {saldoAcumulado >= 0 ? '+' : ''}{formatHoras(saldoAcumulado)}
              </p>
              <p className="text-[10px] text-text-muted">{formatCurrency(saldoAcumuladoValor)}</p>
            </div>
          </div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Clock size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Horas Trabalhadas</p>
              <p className="text-lg font-bold text-foreground-primary">{formatHoras(totalHoras)}</p>
              <p className="text-[10px] text-text-muted">{formatCurrency(totalValor)}</p>
            </div>
          </div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-500/10">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Abatido</p>
              <p className="text-lg font-bold text-red-500">-{formatHoras(totalAbatidoHoras)}</p>
              <p className="text-[10px] text-text-muted">{formatCurrency(totalAbatidoValor)}</p>
            </div>
          </div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${saldoFinal >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Clock size={18} className={saldoFinal >= 0 ? 'text-green-500' : 'text-red-500'} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Saldo Final</p>
              <p className={`text-lg font-bold ${saldoFinal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {saldoFinal >= 0 ? '+' : ''}{formatHoras(saldoFinal)}
              </p>
              <p className="text-[10px] text-text-muted">{formatCurrency(saldoFinalValor)}</p>
            </div>
          </div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-green-500/10">
              <DollarSign size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Valor Total</p>
              <p className="text-lg font-bold text-foreground-primary">{formatCurrency(totalValor - totalAbatidoValor)}</p>
            </div>
          </div>
        </Card>
        <Card className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <TrendingUp size={18} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Media Diaria</p>
              <p className="text-lg font-bold text-foreground-primary">
                {diasComLancamentos > 0 ? formatHoras(totalHoras / diasComLancamentos) : '00:00:00'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-bold text-foreground-primary">Lancamentos</h2>
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-accent-primary/10 text-accent-primary text-sm font-medium hover:bg-accent-primary/20 transition-colors"
                >
                  Filtro: {formatDate(selectedDay)} <span className="text-xs">(clique para limpar)</span>
                </button>
              )}
            </div>
            <DataTable columns={columns} data={horasFiltradas} loading={loading} error={error} emptyMessage="Nenhum lancamento encontrado no periodo" />
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors">
                <ChevronLeft size={18} className="text-text-secondary" />
              </button>
              <h2 className="text-lg font-heading font-bold text-foreground-primary">
                {MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors">
                <ChevronRight size={18} className="text-text-secondary" />
              </button>
            </div>

            {selectedDay && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-xs text-accent-primary font-medium">
                  Filtrando: {formatDate(selectedDay)}
                </span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xs text-text-muted hover:text-accent-red transition-colors"
                >
                  limpar
                </button>
              </div>
            )}

            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-text-muted py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, i) => {
                const isSelected = selectedDay === item.date;
                const hasHours = !!item.horas;
                let bgClass = '';
                let textClass = item.horas ? 'text-accent-primary' : 'text-text-secondary';
                let borderClass = 'border-border-subtle';

                if (item.day === 0) {
                  bgClass = '';
                  borderClass = 'border-transparent';
                } else if (isSelected) {
                  bgClass = 'bg-accent-primary/15 ring-2 ring-accent-primary/30';
                  borderClass = 'border-accent-primary';
                  textClass = 'text-accent-primary font-bold';
                } else if (item.isFeriado && item.isWeekend) {
                  bgClass = hasHours ? 'bg-purple-500/15' : 'bg-purple-500/10';
                  borderClass = 'border-purple-400';
                  textClass = 'text-purple-600';
                } else if (item.isFeriado) {
                  bgClass = hasHours ? 'bg-purple-500/10' : 'bg-purple-500/5';
                  borderClass = 'border-purple-300';
                  textClass = 'text-purple-600';
                } else if (item.isSunday && hasHours) {
                  bgClass = 'bg-red-500/10';
                  borderClass = 'border-red-300';
                  textClass = 'text-red-600';
                } else if (item.isSunday) {
                  bgClass = 'bg-red-500/5';
                  borderClass = 'border-red-200';
                  textClass = 'text-red-500';
                } else if (item.isWeekend && hasHours) {
                  bgClass = 'bg-orange-500/10';
                  borderClass = 'border-orange-300';
                  textClass = 'text-orange-600';
                } else if (item.isWeekend) {
                  bgClass = 'bg-orange-500/5';
                  borderClass = 'border-orange-200';
                  textClass = 'text-orange-500';
                } else if (hasHours) {
                  bgClass = 'bg-accent-primary/5';
                  borderClass = 'border-accent-primary/30';
                }

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => item.day > 0 && handleDayClick(item.date)}
                    disabled={item.day === 0}
                    className={`min-h-[56px] p-1 rounded-lg border text-[11px] transition-colors text-left cursor-pointer ${borderClass} ${bgClass}`}
                  >
                    {item.day > 0 && (
                      <>
                        <div className={`text-right font-medium ${textClass}`}>
                          {item.day}
                        </div>
                        {item.horas && (
                          <div className="mt-0.5">
                            <div className={`font-bold ${item.isFeriado ? 'text-purple-600' : item.isSunday ? 'text-red-600' : item.isWeekend ? 'text-orange-600' : 'text-accent-primary'}`}>{formatHoras(item.horas.horas)}</div>
                            <div className="text-[10px] text-text-muted leading-tight">{formatCurrency(item.horas.valor)}</div>
                          </div>
                        )}
                        {item.isFeriado && (
                          <div className="text-[9px] text-purple-500 leading-tight mt-0.5 truncate" title={item.nomeFeriado}>
                            {item.nomeFeriado}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border-subtle">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
                <span className="text-[11px] text-text-muted">Sabado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                <span className="text-[11px] text-text-muted">Domingo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></div>
                <span className="text-[11px] text-text-muted">Feriado</span>
              </div>
            </div>
          </Card>

        <Card>
          <h3 className="text-lg font-heading font-bold text-foreground-primary mb-4">Variacao Diaria de Valor</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="dia" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px' }}
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  />
                  <Line type="monotone" dataKey="valor" stroke="#2D5E3A" strokeWidth={2} dot={{ r: 3, fill: '#2D5E3A' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
        </Card>
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Hora Trabalhada' : 'Nova Hora Trabalhada'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <HoraTrabalhadaForm
            key={`hora-form-${editing?.id ?? editing?.codigo ?? `new-${newEntryCount}`}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing ?? lastEntry}
            focusDate={focusDate}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Hora Trabalhada"
        message="Tem certeza que deseja excluir este registro? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={showConfirmPdf}
        onClose={() => { if (pdfDoc) downloadPDF(pdfDoc, pdfFilename); setShowConfirmPdf(false); }}
        onConfirm={() => { if (pdfDoc) viewPDF(pdfDoc); setShowConfirmPdf(false); }}
        title="Visualizar Relatorio"
        message="Deseja visualizar o relatorio em nova aba?"
        variant="success"
        confirmLabel="Visualizar"
      />
    </Layout>
  );
}
