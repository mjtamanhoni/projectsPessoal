import { useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { CompraInsumoForm } from '@/components/forms/CompraInsumoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { CompraInsumo, Fornecedor, Insumo } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getDecimalPlaces } from '@/lib/settings';

const columnHelper = createColumnHelper<CompraInsumo>();

export function ComprasInsumo() {
  const { data: compras, loading, error, create, update, remove, fetchOne, refetch } = useApi<CompraInsumo>('/compras-insumo');
  const { data: insumos } = useApi<Insumo>('/insumos');
  const { data: fornecedores } = useApi<Fornecedor>('/fornecedores');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompraInsumo | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

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
    columnHelper.accessor('fornecedor_nome', {
      header: 'Fornecedor',
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
    columnHelper.accessor('valor_unitario', {
      header: 'Valor Unitario',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatCurrency(Number(value)) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('valor_total', {
      header: 'Valor Total',
      cell: (info) => formatCurrency(Number(info.getValue())),
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('data_compra', {
      header: 'Data',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <ShowForPermission rota="/compras-insumo" acao={ACAO.EDITAR}>
            <button
              onClick={() => handleEdit(row.original)}
              className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <Edit2 size={16} className="text-text-secondary" />
            </button>
          </ShowForPermission>
          <ShowForPermission rota="/compras-insumo" acao={ACAO.EXCLUIR}>
            <button
              onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
              className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <Trash2 size={16} className="text-accent-red" />
            </button>
          </ShowForPermission>
        </div>
      ),
    }),
  ];

  const handleEdit = async (compra: CompraInsumo) => {
    const idToFetch = compra.id || compra.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? compra);
    } catch {
      setEditing(compra);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: CompraInsumo) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Compra atualizada com sucesso' : 'Compra cadastrada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar compra';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Compra excluída com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir compra';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Compras de Insumos" subtitle="Gerencie compras de insumos">
        <ShowForPermission rota="/compras-insumo" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Nova Compra
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={compras} loading={loading} error={error} emptyMessage="Nenhuma compra cadastrada" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Compra' : 'Nova Compra'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <CompraInsumoForm
            key={`compra-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            insumos={insumos}
            fornecedores={fornecedores}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Compra"
        message="Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
