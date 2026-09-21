import { useState, useMemo } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { EstoqueInsumoForm } from '@/components/forms/EstoqueInsumoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { EstoqueInsumo, Insumo } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PrintButton } from '@/components/ui/PrintButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { getDecimalPlaces } from '@/lib/settings';
import { formatCurrency } from '@/lib/utils';

const columnHelper = createColumnHelper<EstoqueInsumo>();

export function EstoqueInsumo() {
  const { data: estoques, loading, error, create, update, remove, fetchOne, refetch } = useApi<EstoqueInsumo>('/estoque-insumo');
  const { data: insumos } = useApi<Insumo>('/insumos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EstoqueInsumo | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const printColumns = useMemo(() => [
    { header: 'Código', accessor: (row: Record<string, unknown>) => String(row.id ?? row.codigo ?? '') },
    { header: 'Insumo', accessor: (row: Record<string, unknown>) => String(row.insumo_nome ?? '-') },
    { header: 'Quantidade', accessor: (row: Record<string, unknown>) => row.quantidade != null ? Number(row.quantidade).toFixed(getDecimalPlaces()).replace('.', ',') : '-' },
    { header: 'Data Atualização', accessor: (row: Record<string, unknown>) => formatDate(row.data_atualizacao as string) },
  ], []);

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Código',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('insumo_nome', {
      header: 'Insumo',
      enableSorting: true,
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('quantidade', {
      header: 'Quantidade',
      enableSorting: true,
      cell: (info) => {
        const value = info.getValue();
        const dp = getDecimalPlaces();
        return value != null ? Number(value).toFixed(dp).replace('.', ',') : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('data_atualizacao', {
      header: 'Data Atualização',
      cell: (info) => formatDate(info.getValue()),
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
            rota="/estoque-insumo"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (estoque: EstoqueInsumo) => {
    const idToFetch = estoque.id || estoque.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? estoque);
    } catch {
      setEditing(estoque);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: EstoqueInsumo) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Estoque atualizado com sucesso' : 'Estoque cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar estoque';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Registro excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir registro';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Estoque de Insumos" subtitle="Gerencie o estoque de insumos">
        <PrintButton title="Estoque de Insumos" data={estoques} columns={printColumns} />
        <ShowForPermission rota="/estoque-insumo" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Movimento
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={estoques} loading={loading} error={error} emptyMessage="Nenhum registro de estoque encontrado" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Estoque' : 'Novo Lançamento'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <EstoqueInsumoForm
            key={`estoque-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            insumos={insumos}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Registro"
        message="Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
