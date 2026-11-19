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
import type { Cliente, PontoLancamento, PontoResumo, Servico, Usuario } from '@/types';
import api from '@/lib/api';
import { AlertTriangle, Clock, Minus, Plus, RefreshCw, Timer, User } from 'lucide-react';

const lancamentoColumns = createColumnHelper<PontoLancamento>();
const resumoColumns = createColumnHelper<PontoResumo>();

function formatHoras(valor: number): string {
  const total = Math.round(Math.abs(valor || 0) * 3600);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function competenciaAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function PontoEletronico() {
  const [competencia, setCompetencia] = useState(competenciaAtual);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | undefined>(undefined);
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
    api.get('/usuarios').then((res) => {
      setUsuarios(res.data as Usuario[]);
    }).catch(() => {});
  }, []);

  const carregar = useCallback(async (silent = false) => {
    const [ano, mes] = competencia.split('-').map(Number);
    const params: Record<string, number> = { ano, mes };
    if (filtroUsuarioId) params.usuario_id = filtroUsuarioId;

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
  }, [competencia, filtroUsuarioId, addToast]);

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
      header: 'Valor Excedente',
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
        <ShowForPermission rota="/ponto-eletronico" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setEditingId(null); setModalOpen(true); }}>
            <Plus size={18} /> Nova Marcacao
          </Button>
        </ShowForPermission>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User size={18} className="text-text-secondary" />
            <h2 className="text-lg font-semibold text-foreground-primary">Marcacoes</h2>
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
          data={lancamentos}
          loading={loading}
          emptyMessage="Nenhuma marcacao cadastrada no periodo"
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Marcacao' : 'Nova Marcacao'}>
        <PontoLancamentoForm
          key={`ponto-form-${editingId ?? 'new'}`}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          initial={editing}
          editingId={editingId}
        />
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
