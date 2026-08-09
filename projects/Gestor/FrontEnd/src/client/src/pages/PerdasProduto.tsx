import { useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { PerdaProdutoForm } from '@/components/forms/PerdaProdutoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { PerdaProdutoFabricado } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';

const columnHelper = createColumnHelper<PerdaProdutoFabricado>();

export function PerdasProduto() {
  const { data: perdas, loading, error, create, update, remove, fetchOne, refetch } = useApi<PerdaProdutoFabricado>('/perdas-produto');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PerdaProdutoFabricado | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { addToast } = useToast();

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Código',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('produto_nome', { header: 'Produto', enableSorting: true }),
    columnHelper.accessor('quantidade', { header: 'Quantidade', enableSorting: true, meta: { align: 'right' } as Record<string, string> }),
    columnHelper.accessor('data_perda', { header: 'Data', enableSorting: true }),
    columnHelper.accessor('motivo', { header: 'Motivo', enableSorting: true }),
    columnHelper.display({
      id: 'acoes',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 60,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            rota="/perdas-produto"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const openNew = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleEdit = async (perda: PerdaProdutoFabricado) => {
    const idToFetch = perda.id || perda.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? perda);
    } catch {
      setEditing(perda);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: PerdaProdutoFabricado) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
        closeModal();
        addToast('success', 'Perda atualizada com sucesso');
      } else {
        await create(data);
        setFormKey((k) => k + 1);
        refetch();
        addToast('success', 'Perda cadastrada com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar perda';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Perda excluída com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir perda';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Perdas de Produtos" subtitle="Registro de perdas de produtos fabricados">
        <ShowForPermission rota="/perdas-produto" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Perda
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={perdas} loading={loading} error={error} emptyMessage="Nenhuma perda registrada" />
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Perda' : 'Nova Perda'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <PerdaProdutoForm
            key={`perda-produto-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            initial={editing}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Perda"
        message="Tem certeza que deseja excluir este registro?"
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
