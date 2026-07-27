import { useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { ServicoForm } from '@/components/forms/ServicoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import type { Servico } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

const columnHelper = createColumnHelper<Servico>();

export function Servicos() {
  const { data: servicos, loading, error, create, update, remove, refetch } = useApi<Servico>('/servicos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Servico | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { addToast } = useToast();

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Codigo',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('nome', {
      header: 'Nome',
      enableSorting: true,
    }),
    columnHelper.accessor('valorHora', {
      header: 'Valor/Hora',
      cell: (info) => formatCurrency(Number(info.getValue())),
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('horasMinimas', {
      header: 'Horas Min.',
      cell: (info) => info.getValue() || '-',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Acoes',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          <ShowForPermission rota="/servicos" acao={ACAO.EDITAR}>
            <button
              onClick={() => handleEdit(row.original)}
              className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <Edit2 size={16} className="text-text-secondary" />
            </button>
          </ShowForPermission>
          <ShowForPermission rota="/servicos" acao={ACAO.EXCLUIR}>
            <button
              onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
              className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors ml-1"
            >
              <Trash2 size={16} className="text-accent-red" />
            </button>
          </ShowForPermission>
        </div>
      ),
    }),
  ];

  const handleEdit = (servico: Servico) => {
    const id = servico.id ?? servico.codigo;
    if (!id) return;
    setEditingId(id);
    setEditing(servico);
    setModalOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setEditingId(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const handleSubmit = async (data: Servico) => {
    try {
      if (editingId) {
        await update({ ...data, id: editingId });
        handleCloseModal();
        addToast('success', 'Servico atualizado com sucesso');
      } else {
        await create(data);
        setFormKey((k) => k + 1);
        refetch();
        addToast('success', 'Servico cadastrado com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar servico';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Servico excluido com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir servico';
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
      <PageHeader title="Servicos" subtitle="Gerencie seus servicos">
        <ShowForPermission rota="/servicos" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Novo Servico
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={servicos} loading={loading} error={error} emptyMessage="Nenhum servico cadastrado" />
      </Card>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Servico' : 'Novo Servico'}>
        <ServicoForm
          key={`servico-form-${editingId ?? `new-${formKey}`}`}
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
        title="Excluir Servico"
        message="Tem certeza que deseja excluir este servico? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
