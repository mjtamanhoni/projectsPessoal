import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/utils';
import type { HoraExcedida, HoraExcedidaAjusteInput, Servico } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { RefreshCw, TrendingUp, BarChart3, Plus, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { HoraExcedidaAjusteForm } from '@/components/forms/HoraExcedidaAjusteForm';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '@/lib/api';

const columnHelper = createColumnHelper<HoraExcedida>();

function formatHoras(decimal: number): string {
  if (!decimal) return '00:00:00';
  const abs = Math.abs(decimal);
  const totalSeconds = Math.round(abs * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatHorasComSinal(decimal: number): string {
  return decimal < 0 ? `-${formatHoras(decimal)}` : formatHoras(decimal);
}

export function HorasExcedidas() {
  const { data: excedidas, loading, error, refetch } = useApi<HoraExcedida>('/horas-excedidas');
  const [confirmReset, setConfirmReset] = useState<HoraExcedida | null>(null);
  const [resetting, setResetting] = useState(false);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HoraExcedida | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    api.get('/servicos').then((r) => setServicos(r.data as Servico[])).catch(() => {});
  }, []);

  const ultimoRegistro = useMemo(() => {
    if (!excedidas || excedidas.length === 0) return null;
    return excedidas.reduce((latest, e) => {
      if (e.anoOrigem > latest.anoOrigem || (e.anoOrigem === latest.anoOrigem && e.mesOrigem > latest.mesOrigem)) {
        return e;
      }
      return latest;
    });
  }, [excedidas]);

  const ultimoAcumulado = ultimoRegistro?.deltaHoras ?? 0;

  const ultimoAcumuladoValor = useMemo(() => {
    if (!ultimoRegistro || servicos.length === 0) return 0;
    const servico = servicos.find((s) => (s.id ?? s.codigo) === ultimoRegistro!.servicoId);
    if (!servico) return 0;
    return Math.ceil(ultimoAcumulado * Number(servico.valorHora) * 100) / 100;
  }, [ultimoRegistro, ultimoAcumulado, servicos]);

  const chartData = useMemo(() => {
    if (!excedidas) return [];
    return [...excedidas]
      .sort((a, b) => a.anoOrigem - b.anoOrigem || a.mesOrigem - b.mesOrigem)
      .map((e) => ({
        mesAno: `${String(e.mesOrigem).padStart(2, '0')}/${e.anoOrigem}`,
        acumulado: e.deltaHoras,
      }));
  }, [excedidas]);

  const handleNovo = () => {
    setEditing(null);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleEdit = (item: HoraExcedida) => {
    setEditing(item);
    setEditingId(item.id ?? item.codigo ?? null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
    setEditingId(null);
  };

  const handleSubmit = async (data: HoraExcedidaAjusteInput) => {
    try {
      await api.post('/horas-excedidas/ajuste', data);
      const editando = editingId !== null;
      handleCloseModal();
      await refetch({ silent: true });
      addToast('success', editando ? 'Ajuste atualizado com sucesso' : 'Ajuste lancado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar ajuste';
      addToast('error', msg);
    }
  };

  const handleReset = async () => {
    if (confirmReset === null) return;
    setResetting(true);
    try {
      await api.post('/horas-excedidas/ajuste', {
        usuarioId: confirmReset.usuarioId,
        clienteId: confirmReset.clienteId,
        servicoId: confirmReset.servicoId,
        ano: confirmReset.anoOrigem,
        mes: confirmReset.mesOrigem,
        ajusteHoras: 0,
        observacoes: '',
      } satisfies HoraExcedidaAjusteInput);
      setConfirmReset(null);
      await refetch({ silent: true });
      addToast('success', 'Ajuste manual removido');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover ajuste';
      addToast('error', msg);
    } finally {
      setResetting(false);
    }
  };

  const columns = [
    columnHelper.accessor((row) => `${String(row.mesOrigem).padStart(2, '0')}/${row.anoOrigem}`, {
      id: 'mesAno',
      header: 'Mes/Ano Origem',
      enableSorting: true,
    }),
    columnHelper.accessor('usuarioNome', {
      header: 'Usuario',
      enableSorting: true,
    }),
    columnHelper.accessor('clienteNome', {
      header: 'Cliente',
      enableSorting: true,
    }),
    columnHelper.accessor('servicoNome', {
      header: 'Servico',
      enableSorting: true,
    }),
    columnHelper.accessor('ajusteManual', {
      header: 'Ajuste Manual',
      cell: (info) => {
        const val = Number(info.getValue() || 0);
        if (!val) return <span className="text-text-muted">--</span>;
        return (
          <span className={`font-mono font-medium ${val >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
            {val >= 0 ? '+' : ''}{formatHorasComSinal(val)}
          </span>
        );
      },
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('deltaHoras', {
      header: 'Acumulado (h)',
      cell: (info) => {
        const val = Number(info.getValue());
        return (
          <span className={val >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {val >= 0 ? '+' : ''}{formatHorasComSinal(val)}
          </span>
        );
      },
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.display({
      id: 'acoes',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 50,
      cell: ({ row }) => {
        const temAjuste = Number(row.original.ajusteManual || 0) !== 0;
        return (
          <div className="flex justify-end">
            <RowActions
              rota="/excedidas"
              onEdit={() => handleEdit(row.original)}
              extras={temAjuste ? [{
                rotulo: 'Remover ajuste',
                icone: RotateCcw,
                cor: '#ef4444',
                onClick: () => setConfirmReset(row.original),
                permissaoRota: '/excedidas',
                permissaoAcao: ACAO.EDITAR,
              }] : []}
            />
          </div>
        );
      },
    }),
  ];

  return (
    <Layout>
      <PageHeader title="Horas Excedidas Acumuladas" subtitle="Acompanhe e ajuste horas excedidas acumuladas">
        <ShowForPermission rota="/excedidas" acao={ACAO.EDITAR}>
          <Button onClick={handleNovo}>
            <Plus size={18} /> Ajustar
          </Button>
        </ShowForPermission>
        <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
          <RefreshCw size={18} className="text-text-secondary" />
        </button>
      </PageHeader>

      <div className="flex gap-4 mb-6">
        <Card className="w-56 shrink-0">
          <p className="text-sm text-text-secondary mb-3">Saldo Acumulado Atual</p>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <TrendingUp size={24} className="text-amber-500" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${ultimoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {ultimoAcumulado >= 0 ? '+' : ''}{formatHorasComSinal(ultimoAcumulado)}
              </p>
              <p className="text-sm text-text-muted">{formatCurrency(ultimoAcumuladoValor)}</p>
            </div>
          </div>
        </Card>
        {chartData.length > 1 && (
          <Card className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={16} className="text-text-secondary" />
              <h2 className="text-xs font-medium text-text-secondary">Evolucao do Saldo Acumulado</h2>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mesAno" tick={{ fill: '#6B706C', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6B706C', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [formatHorasComSinal(value), 'Acumulado']}
                  />
                  <Line type="monotone" dataKey="acumulado" stroke="#F59E0B" strokeWidth={2} dot={{ r: 2, fill: '#F59E0B' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      <Card>
        <DataTable columns={columns} data={excedidas} loading={loading} error={error} emptyMessage="Nenhum registro encontrado" />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Alterar Ajuste de Horas Excedidas' : 'Lancar Ajuste de Horas Excedidas'}
      >
        <HoraExcedidaAjusteForm
          key={`hora-excedida-ajuste-form-${editingId ?? 'new'}`}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          initial={editing}
          editingId={editingId}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmReset !== null}
        onClose={() => setConfirmReset(null)}
        onConfirm={handleReset}
        title="Remover Ajuste Manual"
        message="Tem certeza que deseja remover o ajuste manual desta competencia? O saldo acumulado voltara a ser calculado apenas automaticamente."
        variant="danger"
        confirmLabel="Remover"
        loading={resetting}
      />
    </Layout>
  );
}
