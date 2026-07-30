import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDecimals } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, ShoppingCart, Package, TrendingDown, BarChart3, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import type { ProducaoDashboardData } from '@/types';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function ProducaoDashboard() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [data, setData] = useState<ProducaoDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/producao-dashboard', { params: { ano: String(ano), mes: String(mes) } });
      setData(res.data as ProducaoDashboardData);
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

  const kpis = data?.kpis;

  const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const venda = data?.mensal_vendas.find((v) => v.mes === m);
    const compra = data?.mensal_compras.find((c) => c.mes === m);
    const fab = data?.mensal_fabricacao.find((f) => f.mes === m);
    const valorVenda = venda?.valor ?? 0;
    const valorCompra = compra?.valor ?? 0;
    const custo = fab?.custo_total ?? 0;
    return {
      mes: MESES[i].substring(0, 3),
      vendas: valorVenda,
      compras: valorCompra,
      custo,
      lucroBruto: valorVenda - custo,
      lucroLiquido: valorVenda - valorCompra - custo,
      comprasCusto: valorCompra + custo,
    };
  });

  const dailyFabricacao = data?.diario_fabricacao.map((d) => ({
    dia: String(new Date(d.dia).getDate()),
    qtd: d.qtd_fabricada,
  })) ?? [];

  const dailyVendas = data?.diario_vendas.map((d) => ({
    dia: String(new Date(d.dia).getDate()),
    valor: d.valor,
  })) ?? [];

  const chartTooltipStyle = {
    contentStyle: { backgroundColor: '#FFFFFF', border: '1px solid #D6DDD0', borderRadius: '8px', fontSize: 12 },
  };

  const KPI_COLORS = [
    { bg: 'bg-green-100', text: 'text-green-600', icon: TrendingUp },
    { bg: 'bg-orange-100', text: 'text-orange-600', icon: ShoppingCart },
    { bg: 'bg-blue-100', text: 'text-blue-600', icon: Package },
    { bg: 'bg-purple-100', text: 'text-purple-600', icon: TrendingDown },
    { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: DollarSign },
  ];

  return (
    <Layout>
      <PageHeader title="Dashboard Produção" subtitle="Compras, fabricação e vendas" />

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
          <div className="flex flex-wrap gap-4">
            <Card className="flex flex-1 min-w-[180px]">
              <div className="flex items-start gap-3">
                <div className={`p-2 ${KPI_COLORS[0].bg} rounded-lg`}>
                  <TrendingUp size={18} className={KPI_COLORS[0].text} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-secondary truncate">Total Vendas</p>
                  <p className="text-lg font-semibold text-text-primary">{formatCurrency(kpis?.total_vendas ?? 0)}</p>
                  <p className="text-[10px] text-text-muted">{kpis?.qtd_vendas ?? 0} vendas · {formatDecimals(kpis?.qtd_vendida ?? 0, 0)} un</p>
                </div>
              </div>
            </Card>
            <Card className="flex flex-1 min-w-[180px]">
              <div className="flex items-start gap-3">
                <div className={`p-2 ${KPI_COLORS[1].bg} rounded-lg`}>
                  <ShoppingCart size={18} className={KPI_COLORS[1].text} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-secondary truncate">Total Compras</p>
                  <p className="text-lg font-semibold text-text-primary">{formatCurrency(kpis?.total_compras ?? 0)}</p>
                  <p className="text-[10px] text-text-muted">{kpis?.qtd_compras ?? 0} compras</p>
                </div>
              </div>
            </Card>
            <Card className="flex flex-1 min-w-[180px]">
              <div className="flex items-start gap-3">
                <div className={`p-2 ${KPI_COLORS[2].bg} rounded-lg`}>
                  <Package size={18} className={KPI_COLORS[2].text} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-secondary truncate">Fabricado</p>
                  <p className="text-lg font-semibold text-text-primary">{formatDecimals(kpis?.qtd_fabricada ?? 0, 0)} un</p>
                  <p className="text-[10px] text-text-muted">{kpis?.qtd_fabricacoes ?? 0} fabricações</p>
                </div>
              </div>
            </Card>
            <Card className="flex flex-1 min-w-[180px]">
              <div className="flex items-start gap-3">
                <div className={`p-2 ${KPI_COLORS[3].bg} rounded-lg`}>
                  <TrendingDown size={18} className={KPI_COLORS[3].text} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-secondary truncate">Lucro Bruto</p>
                  <p className={`text-lg font-semibold ${(kpis?.lucro_bruto ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(kpis?.lucro_bruto ?? 0)}</p>
                  <p className="text-[10px] text-text-muted">Vendas - Custo</p>
                </div>
              </div>
            </Card>
            <Card className="flex flex-1 min-w-[180px]">
              <div className="flex items-start gap-3">
                <div className={`p-2 ${KPI_COLORS[4].bg} rounded-lg`}>
                  <DollarSign size={18} className={KPI_COLORS[4].text} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-secondary truncate">Lucro Líquido</p>
                  <p className={`text-lg font-semibold ${(kpis?.lucro_liquido ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(kpis?.lucro_liquido ?? 0)}</p>
                  <p className="text-[10px] text-text-muted">Vendas - (Compras + Custo)</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <BarChart3 size={16} className="inline mr-2 text-accent-primary" />
                Vendas vs Custo de Fabricação
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="mes" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatCurrency(value)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="vendas" name="Vendas" fill="#2D5E3A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custo" name="Custo" fill="#C47A5A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <BarChart3 size={16} className="inline mr-2 text-accent-primary" />
                Lucro Bruto Mensal
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="mes" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatCurrency(value)]} />
                  <Bar dataKey="lucroBruto" name="Lucro Bruto" fill="#2D5E3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <BarChart3 size={16} className="inline mr-2 text-accent-primary" />
                Lucro Líquido Mensal
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="mes" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatCurrency(value)]} />
                  <Bar dataKey="lucroLiquido" name="Lucro Líquido" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <BarChart3 size={16} className="inline mr-2 text-accent-primary" />
                Vendas vs Compras + Custo
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="mes" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatCurrency(value)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="vendas" name="Vendas" fill="#2D5E3A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comprasCusto" name="Compras+Custo" fill="#C47A5A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <Package size={16} className="inline mr-2 text-accent-primary" />
                Fabricação por Dia — {MESES[mes - 1]}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyFabricacao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="dia" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatDecimals(value, 0), 'Unidades']} />
                  <Bar dataKey="qtd" name="Fabricado" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                <TrendingUp size={16} className="inline mr-2 text-accent-primary" />
                Vendas por Dia — {MESES[mes - 1]}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyVendas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D6DDD0" />
                  <XAxis dataKey="dia" tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 11 }} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [formatCurrency(value)]} />
                  <Bar dataKey="valor" name="Vendas" fill="#2D5E3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
