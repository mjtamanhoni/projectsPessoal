import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { useToast } from '@/context/ToastContext';
import { carregarFiltrosPonto, competenciaAtualAno, competenciaAtualMes, formatHoras, labelMes, salvarFiltrosPonto } from '@/lib/ponto';
import { formatCurrency } from '@/lib/utils';
import type { PontoDashboardData, Usuario, Cliente, Servico } from '@/types';
import api from '@/lib/api';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend,
  Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, Calendar, ChevronUp, Clock, DollarSign, Loader2, RefreshCw, Search, Timer,
  TrendingUp, Users,
} from 'lucide-react';

const CORES = ['#2D5E3A', '#C47A5A', '#4A7FB5', '#8B6BB5', '#B5843A', '#5AA37A', '#B55A7A'];

const tooltipStyle = {
  contentStyle: { backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px', fontSize: 12 },
};

export function PontoDashboard() {
  const hoje = new Date();
  const salvo = useMemo(() => carregarFiltrosPonto('dashboard'), []);
  const [ano, setAno] = useState(salvo.ano ?? competenciaAtualAno());
  const [mes, setMes] = useState(salvo.mes ?? competenciaAtualMes());
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | undefined>(salvo.usuarioId);
  const [filtroClienteId, setFiltroClienteId] = useState<number | undefined>(salvo.clienteId);
  const [filtroServicoId, setFiltroServicoId] = useState<number | undefined>(salvo.servicoId);
  const [data, setData] = useState<PontoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([api.get('/usuarios'), api.get('/clientes'), api.get('/servicos')])
      .then(([u, c, s]) => {
        setUsuarios(u.data as Usuario[]);
        setClientes(c.data as Cliente[]);
        setServicos(s.data as Servico[]);
      })
      .catch(() => {});
  }, []);

  const carregar = useCallback(async (silent = false) => {
    const params: Record<string, string> = { ano: String(ano), mes: String(mes) };
    if (filtroUsuarioId) params.usuario_id = String(filtroUsuarioId);
    if (filtroClienteId) params.cliente_id = String(filtroClienteId);
    if (filtroServicoId) params.servico_id = String(filtroServicoId);

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/ponto-eletronico/dashboard', { params });
      setData(res.data as PontoDashboardData);
    } catch (err: unknown) {
      setData(null);
      if (!silent) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar dashboard';
        addToast('error', msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ano, mes, filtroUsuarioId, filtroClienteId, filtroServicoId, addToast]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    salvarFiltrosPonto('dashboard', {
      ano,
      mes,
      usuarioId: filtroUsuarioId,
      clienteId: filtroClienteId,
      servicoId: filtroServicoId,
    });
  }, [ano, mes, filtroUsuarioId, filtroClienteId, filtroServicoId]);

  const mensalData = useMemo(
    () => (data?.mensal ?? []).map((m) => ({
      ...m,
      label: m.label || labelMes(m.mes).substring(0, 3),
    })),
    [data],
  );

  const filtroResumo = useMemo(() => {
    const usuario = usuarios.find((u) => (u.id ?? u.codigo) === filtroUsuarioId);
    const cliente = clientes.find((c) => (c.id ?? c.codigo) === filtroClienteId);
    const servico = servicos.find((s) => (s.id ?? s.codigo) === filtroServicoId);
    return {
      usuario: usuario?.nome ?? 'Todos',
      cliente: cliente?.nome ?? 'Todos',
      servico: servico?.nome ?? 'Todos',
    };
  }, [usuarios, clientes, servicos, filtroUsuarioId, filtroClienteId, filtroServicoId]);

  const cards = data?.cards;

  const kpis = [
    { titulo: 'Horas no Ano', valor: formatHoras(cards?.horasAno ?? 0), icon: Calendar, cor: 'text-blue-600', bg: 'bg-blue-100' },
    { titulo: 'Horas no Mes', valor: formatHoras(cards?.horasMes ?? 0), icon: Clock, cor: 'text-green-600', bg: 'bg-green-100' },
    { titulo: 'Horas Hoje', valor: formatHoras(cards?.horasDia ?? 0), icon: Activity, cor: 'text-indigo-600', bg: 'bg-indigo-100' },
    { titulo: 'Excedente no Ano', valor: formatHoras(cards?.excedenteAno ?? 0), icon: Timer, cor: 'text-orange-600', bg: 'bg-orange-100' },
    { titulo: 'Excedente no Mes', valor: formatHoras(cards?.excedenteMes ?? 0), icon: AlertTriangle, cor: 'text-red-600', bg: 'bg-red-100' },
    { titulo: 'Valor Excedente Ano', valor: formatCurrency(cards?.valorExcedenteAno ?? 0), icon: DollarSign, cor: 'text-emerald-600', bg: 'bg-emerald-100' },
    { titulo: 'Valor Excedente Mes', valor: formatCurrency(cards?.valorExcedenteMes ?? 0), icon: DollarSign, cor: 'text-teal-600', bg: 'bg-teal-100' },
    { titulo: 'Valor Trabalhado Ano', valor: formatCurrency(cards?.valorTrabalhadoAno ?? 0), icon: DollarSign, cor: 'text-lime-600', bg: 'bg-lime-100' },
    { titulo: 'Valor Trabalhado Mes', valor: formatCurrency(cards?.valorTrabalhadoMes ?? 0), icon: DollarSign, cor: 'text-green-700', bg: 'bg-green-100' },
    { titulo: 'Valor Hoje', valor: formatCurrency(cards?.valorTrabalhadoDia ?? 0), icon: DollarSign, cor: 'text-emerald-700', bg: 'bg-emerald-100' },
    { titulo: 'Dias Trabalhados', valor: String(cards?.diasTrabalhados ?? 0), icon: TrendingUp, cor: 'text-purple-600', bg: 'bg-purple-100' },
    { titulo: 'Media Diaria', valor: formatHoras(cards?.mediaDiaria ?? 0), icon: Users, cor: 'text-cyan-600', bg: 'bg-cyan-100' },
  ];

  return (
    <Layout>
      <PageHeader
        title="Ponto Eletrônico · Dashboard"
        subtitle="Visão anual, mensal e diária das horas trabalhadas"
      >
        <Button variant="secondary" onClick={() => carregar(true)} title="Atualizar dados">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{labelMes(i + 1)}</option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {Array.from({ length: 6 }, (_, i) => hoje.getFullYear() - 3 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <span className="text-sm text-text-secondary">
            <span className="text-text-muted">Usuário:</span>{' '}
            <span className="font-medium text-text-primary">{filtroResumo.usuario}</span>
            <span className="mx-1.5 text-text-muted">-</span>
            <span className="text-text-muted">Cliente:</span>{' '}
            <span className="font-medium text-text-primary">{filtroResumo.cliente}</span>
            <span className="mx-1.5 text-text-muted">-</span>
            <span className="text-text-muted">Serviços:</span>{' '}
            <span className="font-medium text-text-primary">{filtroResumo.servico}</span>
          </span>

          <Button
            variant="secondary"
            onClick={() => setFiltrosAbertos((v) => !v)}
            title={filtrosAbertos ? 'Retrair filtros' : 'Expandir filtros'}
          >
            <Search size={16} />
          </Button>
        </div>

        {filtrosAbertos && (
          <div className="mt-4 pt-4 border-t border-border-subtle flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Usuário</span>
              <RegistroSelect<number>
                value={filtroUsuarioId ?? null}
                onChange={(v) => setFiltroUsuarioId(v)}
                onClear={() => setFiltroUsuarioId(undefined)}
                options={usuarios.map((u) => ({ value: (u.id ?? u.codigo)!, label: u.nome }))}
                title="Filtro por Usuário"
                placeholder="Todos os usuários"
                className="min-w-[200px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Cliente</span>
              <RegistroSelect<number>
                value={filtroClienteId ?? null}
                onChange={(v) => setFiltroClienteId(v)}
                onClear={() => setFiltroClienteId(undefined)}
                options={clientes.map((c) => ({ value: (c.id ?? c.codigo)!, label: c.nome }))}
                title="Filtro por Cliente"
                placeholder="Todos os clientes"
                className="min-w-[200px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Serviço</span>
              <RegistroSelect<number>
                value={filtroServicoId ?? null}
                onChange={(v) => setFiltroServicoId(v)}
                onClear={() => setFiltroServicoId(undefined)}
                options={servicos.map((s) => ({ value: (s.id ?? s.codigo)!, label: s.nome }))}
                title="Filtro por Serviço"
                placeholder="Todos os serviços"
                className="min-w-[200px]"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setFiltrosAbertos(false)}
              title="Retrair filtros"
            >
              <ChevronUp size={16} />
              Retrair
            </Button>
          </div>
        )}
      </Card>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.titulo}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 ${kpi.bg} rounded-lg`}>
                      <Icon size={18} className={kpi.cor} />
                    </div>
                    <span className="text-xs font-medium text-text-secondary">{kpi.titulo}</span>
                  </div>
                  <p className="text-xl font-semibold font-mono text-text-primary">{kpi.valor}</p>
                </Card>
              );
            })}
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              <Calendar size={16} className="inline mr-2 text-accent-primary" />
              Evolução Mensal — {ano}
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={mensalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                <XAxis dataKey="label" tick={{ fill: '#6B706C', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => formatHoras(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="trabalhadas" name="Trabalhadas" fill="#2D5E3A" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="base" name="Base" stroke="#4A7FB5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="excedentes" name="Excedentes" stroke="#C47A5A" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <Activity size={16} className="inline mr-2 text-accent-primary" />
                Horas por Dia — {labelMes(mes)} {ano}
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.diario}>
                  <defs>
                    <linearGradient id="gradHoras" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2D5E3A" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2D5E3A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="label" tick={{ fill: '#6B706C', fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} formatter={(value: number) => [formatHoras(value), 'Horas']} />
                  <Area type="monotone" dataKey="trabalhadas" stroke="#2D5E3A" strokeWidth={2} fill="url(#gradHoras)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <Users size={16} className="inline mr-2 text-accent-primary" />
                Distribuição por Usuario
              </h3>
              {data.porUsuario.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-text-muted">Sem dados no periodo</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.porUsuario}
                      dataKey="horas"
                      nameKey="nome"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {data.porUsuario.map((_, idx) => (
                        <Cell key={idx} fill={CORES[idx % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(value: number) => formatHoras(value)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              <Timer size={16} className="inline mr-2 text-accent-primary" />
              Horas por Serviço
            </h3>
            {data.porServico.length === 0 ? (
              <div className="flex items-center justify-center h-[240px] text-sm text-text-muted">Sem dados no periodo</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, data.porServico.length * 42)}>
                <BarChart data={data.porServico} layout="vertical" margin={{ left: 12, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" width={150} tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} formatter={(value: number) => [formatHoras(value), 'Horas']} />
                  <Bar dataKey="horas" fill="#4A7FB5" radius={[0, 4, 4, 0]} barSize={18}>
                    {data.porServico.map((_, idx) => (
                      <Cell key={idx} fill={CORES[idx % CORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </Layout>
  );
}
