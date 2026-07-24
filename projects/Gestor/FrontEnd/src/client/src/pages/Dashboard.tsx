import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { DashboardChart } from '@/components/charts/DashboardChart';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertTriangle, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import api from '@/lib/api';
import type { DashboardData } from '@/types';

const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'baixado', label: 'Baixado' },
  { value: 'ambos', label: 'Ambos' },
] as const;

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(primeiroDia);
  const [dataFim, setDataFim] = useState(ultimoDia);
  const [status, setStatus] = useState('ambos');
  const [showFilters, setShowFilters] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      params.status = status;
      const res = await api.get('/dashboard', { params });
      setData(res.data as DashboardData);
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorData.response?.data?.error || errorData.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim, status]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle size={48} className="text-accent-red mb-4" />
          <p className="text-accent-red text-lg">{error}</p>
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  return (
    <Layout>
      <PageHeader title="Dashboard" subtitle="Visão geral das suas finanças">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-background-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors"
        >
          <Filter size={16} />
          Filtros
        </button>
      </PageHeader>

      {showFilters && (
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setDataInicio(primeiroDia); setDataFim(ultimoDia); setStatus('ambos'); }}
              className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors"
            >
              Limpar
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">A Receber</p>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp size={20} className="text-accent-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-accent-primary">{formatCurrency(data.totalAReceber)}</p>
          <p className="text-xs text-text-muted mt-1">
            {data.contasPendentesReceber} contas pendentes
            {data.contasAtrasadasReceber > 0 && (
              <span className="text-accent-red ml-1">
                ({data.contasAtrasadasReceber} atrasadas)
              </span>
            )}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">A Pagar</p>
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown size={20} className="text-accent-red" />
            </div>
          </div>
          <p className="text-2xl font-bold text-accent-red">{formatCurrency(data.totalAPagar)}</p>
          <p className="text-xs text-text-muted mt-1">
            {data.contasPendentesPagar} contas pendentes
            {data.contasAtrasadasPagar > 0 && (
              <span className="text-accent-red ml-1">
                ({data.contasAtrasadasPagar} atrasadas)
              </span>
            )}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Saldo</p>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign size={20} className="text-blue-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${data.saldo >= 0 ? 'text-accent-primary' : 'text-accent-red'}`}>
            {formatCurrency(data.saldo)}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Realizado</p>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {formatCurrency(data.totalRecebido + data.totalPago)}
          </p>
          <p className="text-xs text-text-muted mt-1">Total de movimentações</p>
        </Card>
      </div>

      <DashboardChart
        receitasPorMes={data.receitasPorMes}
        despesasPorMes={data.despesasPorMes}
        receberAberto={data.receberAberto}
        receberRecebido={data.receberRecebido}
        pagarAberto={data.pagarAberto}
        pagarPago={data.pagarPago}
        lucroPorMes={data.lucroPorMes}
      />
    </Layout>
  );
}
