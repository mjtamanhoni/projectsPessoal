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
import { PontoNav } from '@/components/ponto/PontoNav';
import { PontoExcedenteForm } from '@/components/forms/PontoExcedenteForm';
import { useToast } from '@/context/ToastContext';
import { ACAO } from '@/lib/permissions';
import { competenciaAtual, formatHoras } from '@/lib/ponto';
import { formatCurrency } from '@/lib/utils';
import type { PontoExcedenteInput, PontoResumo, Usuario } from '@/types';
import api from '@/lib/api';
import { AlertTriangle, Clock, Plus, RefreshCw, Timer } from 'lucide-react';

const columnHelper = createColumnHelper<PontoResumo>();

export function PontoHorasExcedidas() {
  const [competencia, setCompetencia] = useState(competenciaAtual);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | undefined>(undefined);
  const [registros, setRegistros] = useState<PontoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PontoResumo | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    api.get('/usuarios').then((res) => setUsuarios(res.data as Usuario[])).catch(() => {});
  }, []);

  const carregar = useCallback(async (silent = false) => {
    const [ano, mes] = competencia.split('-').map(Number);
    const params: Record<string, number> = { ano, mes };
    if (filtroUsuarioId) params.usuario_id = filtroUsuarioId;

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/ponto-eletronico/resumo', { params });
      setRegistros(Array.isArray(res.data) ? (res.data as PontoResumo[]) : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar horas excedidas';
      if (!silent) addToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [competencia, filtroUsuarioId, addToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totais = useMemo(() => {
    return registros.reduce((acc, item) => {
      const manual = item.horasExcedidasManual || 0;
      const automatico = Math.max(0, (item.deltaHoras || 0) - manual);
      const valorHora = item.valorHora || 0;
      return {
        total: acc.total + (item.deltaHoras || 0),
        manual: acc.manual + manual,
        automatico: acc.automatico + automatico,
        valor: acc.valor + (item.deltaHoras || 0) * valorHora,
      };
    }, { total: 0, manual: 0, automatico: 0, valor: 0 });
  }, [registros]);

  const handleNovo = () => {
    setEditing(null);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleEdit = (item: PontoResumo) => {
    const id = item.id ?? null;
    if (!id) return;
    setEditing(item);
    setEditingId(id);
    setModalOpen(true);
  };

  const handleSubmit = async (data: PontoExcedenteInput) => {
    const isEdit = !!editingId;
    try {
      await api.post('/ponto-eletronico/excedentes', data);
      setModalOpen(false);
      setEditing(null);
      setEditingId(null);
      await carregar(true);
      addToast('success', isEdit ? 'Ajuste atualizado com sucesso' : 'Horas excedidas lancadas com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar horas excedidas';
      addToast('error', msg);
    }
  };

  const handleReset = async () => {
    if (confirmReset === null) return;
    setResetting(true);
    try {
      await api.delete('/ponto-eletronico/excedentes', { params: { id: confirmReset } });
      setConfirmReset(null);
      await carregar(true);
      addToast('success', 'Ajuste manual removido');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover ajuste';
      addToast('error', msg);
    } finally {
      setResetting(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
    setEditingId(null);
  };

  const columns = [
    columnHelper.accessor('usuarioNome', {
      header: 'Usuario',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('clienteNome', {
      header: 'Cliente',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('servicoNome', {
      header: 'Servico',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
    }),
    columnHelper.accessor('horasTrabalhadas', {
      header: 'Trabalhadas',
      cell: (info) => formatHoras(Number(info.getValue())),
      meta: { align: 'right' } as Record<string, string>,
      enableSorting: true,
    }),
    columnHelper.accessor('horasExcedidasManual', {
      header: 'Ajuste Manual',
      cell: (info) => {
        const val = Number(info.getValue() || 0);
        if (val <= 0) return <span className="text-text-muted">--</span>;
        return <span className="font-mono font-medium">{formatHoras(val)}</span>;
      },
      meta: { align: 'right' } as Record<string, string>,
      enableSorting: true,
    }),
    columnHelper.accessor('deltaHoras', {
      header: 'Total Excedente',
      cell: (info) => (
        <span className="font-mono font-semibold text-accent-red">{formatHoras(Number(info.getValue()))}</span>
      ),
      meta: { align: 'right' } as Record<string, string>,
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'valor',
      header: 'Valor',
      cell: ({ row }) => formatCurrency((row.original.deltaHoras || 0) * (row.original.valorHora || 0)),
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
            rota="/ponto-eletronico/horas-excedidas"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmReset(row.original.id ?? null)}
          />
        </div>
      ),
    }),
  ];

  return (
    <Layout>
      <PageHeader
        title="Ponto Eletrônico · Horas Excedidas"
        subtitle="Lance ajustes manuais somados ao excedente calculado automaticamente"
      >
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
        <ShowForPermission rota="/ponto-eletronico/horas-excedidas" acao={ACAO.INCLUIR}>
          <Button onClick={handleNovo}>
            <Plus size={18} /> Lancar Horas
          </Button>
        </ShowForPermission>
      </PageHeader>

      <PontoNav />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Clock size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Excedente Automatico</p>
              <p className="text-2xl font-bold font-mono text-text-primary">{formatHoras(totais.automatico)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Timer size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Ajuste Manual</p>
              <p className="text-2xl font-bold font-mono text-text-primary">{formatHoras(totais.manual)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/10">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total do Mes</p>
              <p className="text-2xl font-bold font-mono text-text-primary">{formatHoras(totais.total)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-500/10">
              <Timer size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Valor Excedente</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totais.valor)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Horas Excedidas do Periodo</h2>
            <p className="text-sm text-text-secondary">
              O ajuste manual e somado ao excedente automatico; total pode ultrapassar 24h.
            </p>
          </div>
          <button
            onClick={() => carregar(true)}
            className="p-2 rounded-lg border border-border-subtle hover:bg-bg-muted transition-colors"
            title="Atualizar"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={`text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <DataTable
          columns={columns}
          data={registros}
          loading={loading}
          emptyMessage="Nenhuma hora excedida encontrada para o periodo"
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Editar Horas Excedidas' : 'Lancar Horas Excedidas'}
      >
        <PontoExcedenteForm
          key={`ponto-excedente-form-${editingId ?? 'new'}`}
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
        message="Tem certeza que deseja remover o ajuste manual desta competencia? O calculo automatico sera mantido."
        variant="danger"
        confirmLabel="Remover"
        loading={resetting}
      />
    </Layout>
  );
}
