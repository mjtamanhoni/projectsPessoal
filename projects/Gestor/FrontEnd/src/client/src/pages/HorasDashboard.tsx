import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  Clock, TrendingUp, TrendingDown, DollarSign, Calendar, Activity, ChevronLeft, ChevronRight, Loader2, RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import type { HorasDashboardData, HoraExcedida } from '@/types';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatHoras(value: number): string {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${h}h${m > 0 ? m + 'm' : ''}`;
}

function mediaDiaria(total: number, dias: number): string {
  if (dias === 0) return '0h';
  return formatHoras(total / dias);
}

export function HorasDashboard() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [data, setData] = useState<HorasDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/horas-dashboard', { params: { ano: String(ano), mes: String(mes) } });
      setData(res.data as HorasDashboardData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mesAnterior = () => {
    if (mes === 1) { setMes(12); setAno(ano - 1); }
    else { setMes(mes - 1); }
  };

  const mesSeguinte = () => {
    if (mes === 12) { setMes(1); setAno(ano + 1); }
    else { setMes(mes + 1); }
  };

  const dailyMap = new Map<string, { horas: number; valor: number }>();
  data?.diario.forEach((d) => {
    dailyMap.set(d.dia, { horas: d.horas, valor: d.valor });
  });

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const calendarDays: { dia: number; horas: number; valor: number; hasData: boolean }[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) {
    calendarDays.push({ dia: 0, horas: 0, valor: 0, hasData: false });
  }
  for (let d = 1; d <= diasNoMes; d++) {
    const dateStr = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = dailyMap.get(dateStr);
    calendarDays.push({
      dia: d,
      horas: entry?.horas ?? 0,
      valor: entry?.valor ?? 0,
      hasData: !!entry,
    });
  }

  const chartData = data?.diario.map((d) => ({
    dia: String(new Date(d.dia).getDate()),
    horas: d.horas,
    valor: d.valor,
  })) ?? [];

  const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
    const m = data?.mensal.find((mm) => mm.mes === i + 1);
    return {
      mes: MESES[i].substring(0, 3),
      horas: m?.horas ?? 0,
      valor: m?.valor ?? 0,
    };
  });

  const kpis = data?.kpis;
  const { data: excedidas } = useApi<HoraExcedida>('/horas-excedidas');

  const saldoAcumulado = useMemo(() => {
    if (!excedidas) return 0;
    const prevMonth = mes === 1 ? 12 : mes - 1;
    const prevYear = mes === 1 ? ano - 1 : ano;
    const record = excedidas.find((e) => e.anoOrigem === prevYear && e.mesOrigem === prevMonth);
    return record ? record.deltaHoras : 0;
  }, [excedidas, mes, ano]);

  const saldoFinal = (kpis?.totalHoras ?? 0) + saldoAcumulado;

  const chartTooltipStyle = {
    contentStyle: { backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px', fontSize: 12 },
  };

  return (
    <Layout>
      <PageHeader title="Dashboard Horas" subtitle="Visão geral das horas trabalhadas" />

      <div className="flex items-center gap-4 mb-6">
        <Card className="flex items-center gap-3 px-4 py-2">
          <button onClick={mesAnterior} className="p-1 hover:bg-bg-muted rounded transition-colors">
            <ChevronLeft size={18} className="text-text-secondary" />
          </button>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="text-sm font-medium text-text-primary bg-transparent border-none outline-none cursor-pointer"
          >
            {MESES.map((nome, i) => (
              <option key={i + 1} value={i + 1}>{nome}</option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="text-sm font-medium text-text-primary bg-transparent border-none outline-none cursor-pointer"
          >
            {Array.from({ length: 5 }, (_, i) => hoje.getFullYear() - 2 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button onClick={mesSeguinte} className="p-1 hover:bg-bg-muted rounded transition-colors">
            <ChevronRight size={18} className="text-text-secondary" />
          </button>
        </Card>
        <Button variant="secondary" onClick={() => fetchData()} title="Atualizar dados">
          <RefreshCw size={16} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent-primary" />
        </div>
      ) : !data ? (
        <div className="flex justify-center py-20">
          <p className="text-sm text-text-muted">Erro ao carregar dados</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg"><Activity size={18} className="text-blue-600" /></div>
                <span className="text-xs font-medium text-text-secondary">Saldo Acumulado</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">{saldoAcumulado >= 0 ? '+' : ''}{formatHoras(saldoAcumulado)}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg"><TrendingUp size={18} className="text-green-600" /></div>
                <span className="text-xs font-medium text-text-secondary">Total Horas Trabalhadas</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">{formatHoras(kpis?.totalHoras ?? 0)}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg"><TrendingDown size={18} className="text-orange-600" /></div>
                <span className="text-xs font-medium text-text-secondary">Total Abatido</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">{formatHoras(kpis?.totalAbatido ?? 0)}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg"><Clock size={18} className="text-purple-600" /></div>
                <span className="text-xs font-medium text-text-secondary">Saldo Final</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">{formatHoras(saldoFinal)}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg"><DollarSign size={18} className="text-emerald-600" /></div>
                <span className="text-xs font-medium text-text-secondary">Valor Total</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">{formatCurrency(kpis?.totalValor ?? 0)}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 rounded-lg"><Calendar size={18} className="text-indigo-600" /></div>
                <span className="text-xs font-medium text-text-secondary">Média Diária</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">{mediaDiaria(kpis?.totalHoras ?? 0, kpis?.diasTrabalhados ?? 0)}</p>
            </Card>
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              <Calendar size={16} className="inline mr-2 text-accent-primary" />
              Calendário Diário — {MESES[mes - 1]} {ano}
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-text-secondary py-1">{d}</div>
              ))}
              {calendarDays.map((day, i) => (
                <div
                  key={i}
                  className={`text-center p-1.5 rounded-lg text-[11px] min-h-[52px] ${
                    day.hasData
                      ? 'bg-accent-primary/5 border border-accent-primary/20'
                      : day.dia > 0 ? 'bg-bg-muted/30' : ''
                  }`}
                >
                  {day.dia > 0 && (
                    <>
                      <div className="font-medium text-text-primary mb-0.5">{day.dia}</div>
                      {day.hasData && (
                        <>
                          <div className="text-[10px] text-accent-primary font-medium">{formatHoras(day.horas)}</div>
                          <div className="text-[9px] text-text-muted">{formatCurrency(day.valor)}</div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <Activity size={16} className="inline mr-2 text-accent-primary" />
                Variação Diária (Horas)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="dia" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatHoras(value), 'Horas']} />
                  <Line type="monotone" dataKey="horas" stroke="#2D5E3A" strokeWidth={2} dot={{ r: 3, fill: '#2D5E3A' }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <DollarSign size={16} className="inline mr-2 text-accent-primary" />
                Variação Diária (Valores)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="dia" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                  <Line type="monotone" dataKey="valor" stroke="#C47A5A" strokeWidth={2} dot={{ r: 3, fill: '#C47A5A' }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              <Calendar size={16} className="inline mr-2 text-accent-primary" />
              Totais Mensais — {ano}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-2 px-3 text-text-secondary font-medium">Mês</th>
                    <th className="text-right py-2 px-3 text-text-secondary font-medium">Horas</th>
                    <th className="text-right py-2 px-3 text-text-secondary font-medium">Valor</th>
                    <th className="text-right py-2 px-3 text-text-secondary font-medium">Abatido</th>
                    <th className="text-right py-2 px-3 text-text-secondary font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {MESES.map((nome, i) => {
                    const m = i + 1;
                    const horas = data.mensal.find((mm) => mm.mes === m)?.horas ?? 0;
                    const valor = data.mensal.find((mm) => mm.mes === m)?.valor ?? 0;
                    const abatido = data.abatidoMensal.find((a) => a.mes === m)?.horas_abatidas ?? 0;
                    const saldo = horas - abatido;
                    return (
                      <tr key={m} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-text-primary font-medium">{nome}</td>
                        <td className="py-2 px-3 text-right text-text-primary">{formatHoras(horas)}</td>
                        <td className="py-2 px-3 text-right text-text-primary">{formatCurrency(valor)}</td>
                        <td className="py-2 px-3 text-right text-text-secondary">{formatHoras(abatido)}</td>
                        <td className={`py-2 px-3 text-right font-medium ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatHoras(saldo)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-bg-muted/50 font-semibold">
                    <td className="py-2 px-3 text-text-primary">Total</td>
                    <td className="py-2 px-3 text-right text-text-primary">{formatHoras(data.mensal.reduce((a, m) => a + m.horas, 0))}</td>
                    <td className="py-2 px-3 text-right text-text-primary">{formatCurrency(data.mensal.reduce((a, m) => a + m.valor, 0))}</td>
                    <td className="py-2 px-3 text-right text-text-secondary">{formatHoras(data.abatidoMensal.reduce((a, m) => a + m.horas_abatidas, 0))}</td>
                    <td className="py-2 px-3 text-right">{formatHoras(data.mensal.reduce((a, m) => a + m.horas, 0) - data.abatidoMensal.reduce((a, m) => a + m.horas_abatidas, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <Activity size={16} className="inline mr-2 text-accent-primary" />
                Horas por Mês
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="mes" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatHoras(value), 'Horas']} />
                  <Bar dataKey="horas" radius={[4, 4, 0, 0]}>
                    {monthlyChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.horas > 0 ? '#2D5E3A' : '#D6DDD0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <DollarSign size={16} className="inline mr-2 text-accent-primary" />
                Valores por Mês
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="mes" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                    {monthlyChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.valor > 0 ? '#C47A5A' : '#D6DDD0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
