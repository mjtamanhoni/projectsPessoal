import { useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { ClienteForm } from '@/components/forms/ClienteForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Cliente } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';

const columnHelper = createColumnHelper<Cliente>();

export function Clientes() {
  const { data: clientes, loading, error, create, update, remove, fetchOne, refetch } = useApi<Cliente>('/clientes');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
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
    }),
    columnHelper.accessor('nome', {
      header: 'Nome',
      enableSorting: true,
    }),
    columnHelper.accessor('telefone', {
      header: 'Telefone',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('celular', {
      header: 'Celular',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('email', {
      header: 'Email',
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
            rota="/clientes"
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

  const handleEdit = async (cliente: Cliente) => {
    const idToFetch = cliente.id || cliente.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? cliente);
    } catch {
      setEditing(cliente);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: Cliente) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
        closeModal();
        addToast('success', 'Cliente atualizado com sucesso');
      } else {
        await create(data);
        setFormKey((k) => k + 1);
        refetch();
        addToast('success', 'Cliente cadastrado com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar cliente';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Cliente excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir cliente';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Clientes" subtitle="Gerencie seus clientes">
        <ShowForPermission rota="/clientes" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Novo Cliente
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={clientes} loading={loading} error={error} emptyMessage="Nenhum cliente cadastrado" />
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Cliente' : 'Novo Cliente'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <ClienteForm
            key={`cliente-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
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
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
