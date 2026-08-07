import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { RegistroSelect } from '@/components/ui/RegistroSelect';
import { HoraAbatidaForm } from '@/components/forms/HoraAbatidaForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { HoraAbatida, Usuario } from '@/types';
import api from '@/lib/api';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, Clock, DollarSign, TrendingDown, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

const columnHelper = createColumnHelper<HoraAbatida>();

function formatHorasAbatidas(decimal: number): string {
  if (!decimal) return '00:00:00';
  const abs = Math.abs(decimal);
  const totalSeconds = Math.round(abs * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Abatimentos() {
  const { data: abatimentos, loading, error, create, update, remove, refetch } = useApi<HoraAbatida>('/horas-abatidas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HoraAbatida | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<number | undefined>(undefined);

  useEffect(() => {
    api.get('/usuarios').then((res) => {
      setUsuarios(res.data as Usuario[]);
    }).catch(() => {});
  }, []);

  const abatimentosFiltrados = useMemo(() => {
    if (!filtroUsuarioId) return abatimentos;
    return abatimentos.filter((a) => a.usuarioId === filtroUsuarioId);
  }, [abatimentos, filtroUsuarioId]);

  const totalValor = useMemo(() =>
    abatimentosFiltrados.reduce((acc, a) => acc + a.valor, 0),
    [abatimentosFiltrados]
  );

  const totalHoras = useMemo(() =>
    abatimentosFiltrados.reduce((acc, a) => acc + a.quantidadeHoras, 0),
    [abatimentosFiltrados]
  );

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Código',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('usuarioNome', {
      header: 'Usuário',
      enableSorting: true,
    }),
    columnHelper.accessor('clienteNome', {
      header: 'Cliente',
      enableSorting: true,
    }),
    columnHelper.accessor('servicoNome', {
      header: 'Serviço',
      enableSorting: true,
    }),
    columnHelper.accessor('dataAbatimento', {
      header: 'Data',
      cell: (info) => formatDate(info.getValue()),
      enableSorting: true,
    }),
    columnHelper.accessor('valor', {
      header: 'Valor',
      cell: (info) => formatCurrency(Number(info.getValue())),
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('valorHora', {
      header: 'Valor/Hora',
      cell: (info) => formatCurrency(Number(info.getValue())),
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('quantidadeHoras', {
      header: 'Horas',
      cell: (info) => formatHorasAbatidas(Number(info.getValue())),
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('observacoes', {
      header: 'Observações',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.display({
      id: 'acoes',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 60,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-0.5">
          <ShowForPermission rota="/abatimentos" acao={ACAO.EDITAR}>
            <button
              onClick={() => handleEdit(row.original)}
              className="p-1 rounded hover:bg-bg-muted transition-colors"
            >
              <Edit2 size={14} className="text-text-secondary" />
            </button>
          </ShowForPermission>
          <ShowForPermission rota="/abatimentos" acao={ACAO.EXCLUIR}>
            <button
              onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
              className="p-1 rounded hover:bg-bg-muted transition-colors"
            >
              <Trash2 size={14} className="text-accent-red" />
            </button>
          </ShowForPermission>
        </div>
      ),
    }),
  ];

  const handleEdit = (abatimento: HoraAbatida) => {
    const id = abatimento.id ?? abatimento.codigo;
    if (!id) return;
    setEditingId(id);
    setEditing(abatimento);
    setModalOpen(true);
  };

  const handleSubmit = async (data: HoraAbatida) => {
    const isEdit = !!editingId;
    try {
      if (editingId) {
        await update({ ...data, id: editingId });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      setEditingId(null);
      addToast('success', isEdit ? 'Abatimento atualizado com sucesso' : 'Abatimento cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar abatimento';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Abatimento excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir abatimento';
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

  return (
    <Layout>
      <PageHeader title="Abatimentos de Horas" subtitle="Registre abatimentos sobre o saldo de horas">
        <RegistroSelect<number>
          value={filtroUsuarioId ?? null}
          onChange={(v) => setFiltroUsuarioId(v)}
          options={usuarios.map((u) => ({ value: (u.id ?? u.codigo)!, label: u.nome }))}
          title="Filtro por Usuario"
          placeholder="Todos os usuarios"
        />
        <ShowForPermission rota="/abatimentos" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setEditingId(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Abatimento
          </Button>
        </ShowForPermission>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/10">
              <DollarSign size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Abatido (R$)</p>
              <p className="text-2xl font-bold text-foreground-primary">{formatCurrency(totalValor)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <Clock size={24} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Horas Abatidas</p>
              <p className="text-2xl font-bold text-foreground-primary">{formatHorasAbatidas(totalHoras)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={abatimentosFiltrados} loading={loading} error={error} emptyMessage="Nenhum abatimento cadastrado" />
      </Card>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Abatimento' : 'Novo Abatimento'}>
        <HoraAbatidaForm
          key={`abatimento-form-${editingId ?? 'new'}`}
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
        title="Excluir Abatimento"
        message="Tem certeza que deseja excluir este abatimento? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
