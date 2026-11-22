import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { PrintButton } from '@/components/ui/PrintButton';
import { PontoNav } from '@/components/ponto/PontoNav';
import { useToast } from '@/context/ToastContext';
import {
  carregarFiltrosPonto, competenciaAtual, exportarCsv, formatHoras, labelMes, salvarFiltrosPonto,
} from '@/lib/ponto';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PrintColumn } from '@/lib/cadastro-pdf';
import type { PontoDashboardData, PontoLancamento, PontoResumo, Usuario, Cliente, Servico } from '@/types';
import api from '@/lib/api';
import {
  Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, Calendar, Clock, DollarSign, Download, FileSpreadsheet, Loader2, Timer, TrendingUp,
} from 'lucide-react';

type TipoRelatorio = 'marcacoes' | 'diario' | 'mensal' | 'anual';

const TIPOS: Array<{ valor: TipoRelatorio; label: string }> = [
  { valor: 'marcacoes', label: 'Marcações' },
  { valor: 'diario', label: 'Diário' },
  { valor: 'mensal', label: 'Mensal' },
  { valor: 'anual', label: 'Anual' },
];

interface Tabela {
  titulo: string;
  cabecalho: string[];
  linhas: Array<Array<string | number>>;
  total?: Array<string | number>;
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px', fontSize: 12 },
};

export function PontoRelatorios() {
  const salvo = useMemo(() => carregarFiltrosPonto('relatorios'), []);
  const [tipo, setTipo] = useState<TipoRelatorio>((salvo.tipo as TipoRelatorio) || 'marcacoes');
  const [competencia, setCompetencia] = useState(salvo.competencia ?? competenciaAtual());
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | undefined>(salvo.usuarioId);
  const [filtroClienteId, setFiltroClienteId] = useState<number | undefined>(salvo.clienteId);
  const [filtroServicoId, setFiltroServicoId] = useState<number | undefined>(salvo.servicoId);
  const [marcacoes, setMarcacoes] = useState<PontoLancamento[]>([]);
  const [resumo, setResumo] = useState<PontoResumo[]>([]);
  const [dashboard, setDashboard] = useState<PontoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    salvarFiltrosPonto('relatorios', {
      tipo,
      competencia,
      usuarioId: filtroUsuarioId,
      clienteId: filtroClienteId,
      servicoId: filtroServicoId,
    });
  }, [tipo, competencia, filtroUsuarioId, filtroClienteId, filtroServicoId]);

  const carregar = useCallback(async () => {
    const [ano, mes] = competencia.split('-').map(Number);
    const params: Record<string, string | number> = { ano, mes };
    if (filtroUsuarioId) params.usuario_id = filtroUsuarioId;
    if (filtroClienteId) params.cliente_id = filtroClienteId;
    if (filtroServicoId) params.servico_id = filtroServicoId;

    setLoading(true);
    try {
      const [dashRes, dadosRes] = await Promise.all([
        api.get('/ponto-eletronico/dashboard', { params }),
        tipo === 'marcacoes'
          ? api.get('/ponto-eletronico/lancamentos', { params })
          : tipo === 'mensal'
            ? api.get('/ponto-eletronico/resumo', { params })
            : Promise.resolve({ data: null }),
      ]);

      setDashboard(dashRes.data as PontoDashboardData);
      if (tipo === 'marcacoes') {
        setMarcacoes(Array.isArray(dadosRes.data) ? (dadosRes.data as PontoLancamento[]) : []);
      } else if (tipo === 'mensal') {
        setResumo(Array.isArray(dadosRes.data) ? (dadosRes.data as PontoResumo[]) : []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar relatorio';
      addToast('error', msg);
      setMarcacoes([]);
      setResumo([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [tipo, competencia, filtroUsuarioId, filtroClienteId, filtroServicoId, addToast]);

  useEffect(() => { carregar(); }, [carregar]);

  const [ano, mes] = competencia.split('-').map(Number);
  const periodo = `${labelMes(mes)} / ${ano}`;

  const tabela = useMemo<Tabela>(() => {
    if (tipo === 'marcacoes') {
      return {
        titulo: `Marcações de Ponto — ${periodo}`,
        cabecalho: ['Data', 'Hora', 'Usuário', 'Cliente', 'Serviço', 'Tipo', 'Observações'],
        linhas: marcacoes.map((m) => [
          formatDate(m.dataServico),
          m.horaLancamento,
          m.usuarioNome || '',
          m.clienteNome || '',
          m.servicoNome || '',
          m.tipoLancamento === 'E' ? 'Entrada' : 'Saída',
          m.observacoes || '',
        ]),
      };
    }

    if (tipo === 'diario') {
      const dias = (dashboard?.diario ?? []).filter((d) => d.trabalhadas > 0 || d.valor > 0);
      const total = dias.reduce(
        (acc, d) => ({ horas: acc.horas + d.trabalhadas, valor: acc.valor + d.valor }),
        { horas: 0, valor: 0 },
      );
      return {
        titulo: `Diário — ${periodo}`,
        cabecalho: ['Dia', 'Horas', 'Valor'],
        linhas: dias.map((d) => [
          `${String(d.dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`,
          formatHoras(d.trabalhadas),
          formatCurrency(d.valor),
        ]),
        total: ['TOTAL', formatHoras(total.horas), formatCurrency(total.valor)],
      };
    }

    if (tipo === 'mensal') {
      const total = resumo.reduce(
        (acc, r) => ({
          base: acc.base + (r.horasBase || 0),
          trabalhadas: acc.trabalhadas + (r.horasTrabalhadas || 0),
          abatidas: acc.abatidas + (r.horasAbatidas || 0),
          manual: acc.manual + (r.horasExcedidasManual || 0),
          delta: acc.delta + (r.deltaHoras || 0),
          valor: acc.valor + (r.deltaHoras || 0) * (r.valorHora || 0),
        }),
        { base: 0, trabalhadas: 0, abatidas: 0, manual: 0, delta: 0, valor: 0 },
      );
      return {
        titulo: `Mensal — ${periodo}`,
        cabecalho: ['Usuário', 'Cliente', 'Serviço', 'Base', 'Trabalhadas', 'Abatidas', 'Ajuste', 'Excedente', 'Valor'],
        linhas: resumo.map((r) => [
          r.usuarioNome || '',
          r.clienteNome || '',
          r.servicoNome || '',
          formatHoras(r.horasBase || 0),
          formatHoras(r.horasTrabalhadas || 0),
          formatHoras(r.horasAbatidas || 0),
          formatHoras(r.horasExcedidasManual || 0),
          formatHoras(r.deltaHoras || 0),
          formatCurrency((r.deltaHoras || 0) * (r.valorHora || 0)),
        ]),
        total: ['TOTAL', '', '', formatHoras(total.base), formatHoras(total.trabalhadas), formatHoras(total.abatidas), formatHoras(total.manual), formatHoras(total.delta), formatCurrency(total.valor)],
      };
    }

    const mensal = dashboard?.mensal ?? [];
    const total = mensal.reduce(
      (acc, m) => ({
        trabalhadas: acc.trabalhadas + m.trabalhadas,
        base: acc.base + m.base,
        abatidas: acc.abatidas + m.abatidas,
        excedentes: acc.excedentes + m.excedentes,
        valor: acc.valor + (m.valor || 0),
      }),
      { trabalhadas: 0, base: 0, abatidas: 0, excedentes: 0, valor: 0 },
    );
    return {
      titulo: `Anual — ${ano}`,
      cabecalho: ['Mês', 'Trabalhadas', 'Base', 'Abatidas', 'Excedentes', 'Valor'],
      linhas: mensal.map((m) => [
        m.label || labelMes(m.mes),
        formatHoras(m.trabalhadas),
        formatHoras(m.base),
        formatHoras(m.abatidas),
        formatHoras(m.excedentes),
        formatCurrency(m.valor || 0),
      ]),
      total: ['TOTAL', formatHoras(total.trabalhadas), formatHoras(total.base), formatHoras(total.abatidas), formatHoras(total.excedentes), formatCurrency(total.valor)],
    };
  }, [tipo, periodo, ano, mes, marcacoes, resumo, dashboard]);

  const printData = useMemo(() => {
    const base = tabela.linhas.map((linha) => {
      const obj: Record<string, unknown> = {};
      linha.forEach((valor, idx) => { obj[`c${idx}`] = valor; });
      return obj;
    });
    if (tabela.total) {
      const obj: Record<string, unknown> = {};
      tabela.total.forEach((valor, idx) => { obj[`c${idx}`] = valor; });
      base.push(obj);
    }
    return base;
  }, [tabela]);

  const printColumns = useMemo<PrintColumn[]>(
    () => tabela.cabecalho.map((header, idx) => ({
      header,
      accessor: (row: Record<string, unknown>) => (row[`c${idx}`] as string | number) ?? '',
    })),
    [tabela],
  );

  const handleExportar = () => {
    const linhas = tabela.total ? [...tabela.linhas, tabela.total] : tabela.linhas;
    exportarCsv(`${tipo}-ponto-${competencia}.csv`, tabela.cabecalho, linhas);
    addToast('success', 'Relatorio exportado em CSV');
  };

  const colunasNumericas = ['Base', 'Trabalhadas', 'Abatidas', 'Ajuste', 'Excedente', 'Valor', 'Horas'];

  const cards = dashboard?.cards;
  const kpis = [
    { titulo: 'Horas no Ano', valor: formatHoras(cards?.horasAno ?? 0), icon: Calendar, cor: 'text-blue-600', bg: 'bg-blue-100' },
    { titulo: 'Horas no Mês', valor: formatHoras(cards?.horasMes ?? 0), icon: Clock, cor: 'text-green-600', bg: 'bg-green-100' },
    { titulo: 'Horas no Dia', valor: formatHoras(cards?.horasDia ?? 0), icon: TrendingUp, cor: 'text-indigo-600', bg: 'bg-indigo-100' },
    { titulo: 'Valor no Ano', valor: formatCurrency(cards?.valorTrabalhadoAno ?? 0), icon: DollarSign, cor: 'text-emerald-600', bg: 'bg-emerald-100' },
    { titulo: 'Valor no Mês', valor: formatCurrency(cards?.valorTrabalhadoMes ?? 0), icon: DollarSign, cor: 'text-teal-600', bg: 'bg-teal-100' },
    { titulo: 'Valor no Dia', valor: formatCurrency(cards?.valorTrabalhadoDia ?? 0), icon: DollarSign, cor: 'text-lime-600', bg: 'bg-lime-100' },
    { titulo: 'Excedente no Ano', valor: formatHoras(cards?.excedenteAno ?? 0), icon: Timer, cor: 'text-orange-600', bg: 'bg-orange-100' },
    { titulo: 'Excedente no Mês', valor: formatHoras(cards?.excedenteMes ?? 0), icon: AlertTriangle, cor: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <Layout>
      <PageHeader
        title="Ponto Eletrônico · Relatórios"
        subtitle="Valores anuais, mensais e diários com detalhamento e exportação"
      >
        <Button variant="secondary" onClick={handleExportar} disabled={tabela.linhas.length === 0}>
          <Download size={16} /> CSV
        </Button>
        <PrintButton title={tabela.titulo} data={printData} columns={printColumns} />
      </PageHeader>

      <PontoNav />

      <Card className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-muted border border-border-subtle">
            {TIPOS.map((t) => (
              <button
                key={t.valor}
                onClick={() => setTipo(t.valor)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tipo === t.valor
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="h-9 rounded-lg border border-border-subtle bg-bg-card px-3 text-sm text-text-primary"
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
          <RegistroSelect<number>
            value={filtroServicoId ?? null}
            onChange={(v) => setFiltroServicoId(v)}
            onClear={() => setFiltroServicoId(undefined)}
            options={servicos.map((s) => ({ value: (s.id ?? s.codigo)!, label: s.nome }))}
            title="Filtro por Servico"
            placeholder="Todos os servicos"
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.titulo}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-2 ${kpi.bg} rounded-lg`}>
                      <Icon size={16} className={kpi.cor} />
                    </div>
                    <span className="text-xs font-medium text-text-secondary">{kpi.titulo}</span>
                  </div>
                  <p className="text-lg font-semibold font-mono text-text-primary">{kpi.valor}</p>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <Calendar size={16} className="inline mr-2 text-accent-primary" />
                Evolução Anual — {ano}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={dashboard?.mensal ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="label" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis yAxisId="horas" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis yAxisId="valor" orientation="right" tick={{ fill: '#6B706C', fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number, name: string) => [name === 'Valor' ? formatCurrency(value) : formatHoras(value), name]}
                  />
                  <Bar yAxisId="horas" dataKey="trabalhadas" name="Trabalhadas" fill="#2D5E3A" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="valor" type="monotone" dataKey="valor" name="Valor" stroke="#C47A5A" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <Clock size={16} className="inline mr-2 text-accent-primary" />
                Evolução Diária — {periodo}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dashboard?.diario ?? []}>
                  <defs>
                    <linearGradient id="gradRelatorioHoras" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A7FB5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4A7FB5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="label" tick={{ fill: '#6B706C', fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} formatter={(value: number) => [formatHoras(value), 'Horas']} />
                  <Area type="monotone" dataKey="trabalhadas" name="Horas" stroke="#4A7FB5" strokeWidth={2} fill="url(#gradRelatorioHoras)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-accent-primary" />
                <h2 className="text-lg font-semibold text-text-primary">{tabela.titulo}</h2>
              </div>
              <span className="text-sm text-text-secondary">{tabela.linhas.length} registro(s)</span>
            </div>

            {tabela.linhas.length === 0 ? (
              <div className="flex justify-center py-16">
                <p className="text-sm text-text-muted">Nenhum registro encontrado para o periodo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {tabela.cabecalho.map((header) => (
                        <th
                          key={header}
                          className={`py-2 px-3 text-text-secondary font-medium whitespace-nowrap ${
                            colunasNumericas.includes(header) ? 'text-right' : 'text-left'
                          }`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tabela.linhas.map((linha, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                        {linha.map((valor, colIdx) => {
                          const numerica = colunasNumericas.includes(tabela.cabecalho[colIdx]);
                          return (
                            <td
                              key={colIdx}
                              className={`py-2 px-3 text-text-primary whitespace-nowrap ${
                                numerica ? 'text-right font-mono' : colIdx === 0 ? 'text-left font-medium' : 'text-left'
                              }`}
                            >
                              {valor}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {tabela.total && (
                      <tr className="bg-bg-muted/60 font-semibold">
                        {tabela.total.map((valor, colIdx) => {
                          const numerica = colunasNumericas.includes(tabela.cabecalho[colIdx]);
                          return (
                            <td
                              key={colIdx}
                              className={`py-2 px-3 text-text-primary whitespace-nowrap ${
                                numerica ? 'text-right font-mono' : 'text-left'
                              }`}
                            >
                              {valor}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </Layout>
  );
}
