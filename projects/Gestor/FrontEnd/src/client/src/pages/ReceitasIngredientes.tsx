import { useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { ReceitaIngredienteForm } from '@/components/forms/ReceitaIngredienteForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { ReceitaIngrediente } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';


const columnHelper = createColumnHelper<ReceitaIngrediente>();

export function ReceitasIngredientes() {
  const { data: ingredientes, loading, error, create, update, remove, fetchOne, refetch } = useApi<ReceitaIngrediente>('/receitas-ingredientes');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReceitaIngrediente | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Codigo',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('insumo_nome', {
      header: 'Insumo',
      enableSorting: true,
      cell: (info) => {
        const row = info.row.original;
        return (
          <span className={!row.insumo_ativo ? 'text-accent-red line-through' : ''}>
            {info.getValue()}
            {!row.insumo_ativo && <span className="ml-2 text-xs bg-accent-red/10 text-accent-red px-1.5 py-0.5 rounded">Inativo</span>}
          </span>
        );
      },
    }),
    columnHelper.accessor('quantidade', {
      header: 'Quantidade',
      cell: (info) => Number(info.getValue()).toFixed(6),
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor((row) => row.produto_fabricado_id, {
      id: 'produto_fabricado_id',
      header: 'Cod. Produto',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <ShowForPermission rota="/receitas-ingredientes" acao={ACAO.EDITAR}>
            <button onClick={() => handleEdit(row.original)} className="p-1 rounded hover:bg-bg-muted transition-colors">
              <Edit2 size={14} className="text-text-secondary" />
            </button>
          </ShowForPermission>
          <ShowForPermission rota="/receitas-ingredientes" acao={ACAO.EXCLUIR}>
            <button onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)} className="p-1 rounded hover:bg-bg-muted transition-colors">
              <Trash2 size={14} className="text-accent-red" />
            </button>
          </ShowForPermission>
        </div>
      ),
      size: 60,
    }),
  ];

  const handleEdit = async (item: ReceitaIngrediente) => {
    const idToFetch = item.id || item.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? item);
    } catch {
      setEditing(item);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: ReceitaIngrediente) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Ingrediente atualizado com sucesso' : 'Ingrediente cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar ingrediente';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Ingrediente excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir ingrediente';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Receitas - Ingredientes" subtitle="Gerencie ingredientes das receitas">
        <ShowForPermission rota="/receitas-ingredientes" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Ingrediente
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={ingredientes} loading={loading} error={error} emptyMessage="Nenhum ingrediente cadastrado" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Ingrediente' : 'Novo Ingrediente'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <ReceitaIngredienteForm
            key={`ri-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Ingrediente"
        message="Tem certeza que deseja excluir este ingrediente? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
