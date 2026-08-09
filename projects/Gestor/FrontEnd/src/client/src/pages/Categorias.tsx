import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { CategoriaForm } from '@/components/forms/CategoriaForm';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import type { Categoria } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';

const columnHelper = createColumnHelper<Categoria>();

export function Categorias() {
  const [pagar, setPagar] = useState<Categoria[]>([]);
  const [receber, setReceber] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [tipo, setTipo] = useState<'pagar' | 'receber'>('pagar');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, r] = await Promise.all([
        api.get('/categorias/pagar'),
        api.get('/categorias/receber'),
      ]);
      setPagar(p.data as Categoria[]);
      setReceber(r.data as Categoria[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar categorias';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Código',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('nome', {
      header: 'Nome',
      enableSorting: true,
    }),
    columnHelper.accessor('descricao', {
      header: 'Descrição',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('ativo', {
      header: 'Ativo',
      cell: (info) => (
        <span className={`status-badge ${info.getValue() ? 'pago' : 'atrasado'}`}>
          {info.getValue() ? 'Sim' : 'Não'}
        </span>
      ),
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
            rota="/categorias"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (cat: Categoria) => {
    const idToFetch = cat.id || cat.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const endpoint = tipo === 'pagar' ? '/categorias/pagar' : '/categorias/receber';
      const response = await api.get(endpoint, { params: { id: idToFetch } });
      const fetched = response.data as Categoria[];
      setEditing(fetched && fetched.length > 0 ? fetched[0] : cat);
    } catch {
      setEditing(cat);
    } finally {
      setFetchingOne(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (data: Categoria) => {
    const endpoint = tipo === 'pagar' ? '/categorias/pagar' : '/categorias/receber';
    try {
      if (editing) {
        await api.post(endpoint, [{ ...data, id: editing.id ?? editing.codigo }]);
        closeModal();
        addToast('success', 'Categoria atualizada com sucesso');
      } else {
        await api.post(endpoint, [data]);
        setFormKey((k) => k + 1);
        fetchData();
        addToast('success', 'Categoria cadastrada com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar categoria';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    const endpoint = tipo === 'pagar' ? '/categorias/pagar' : '/categorias/receber';
    setDeleting(true);
    try {
      await api.delete(endpoint, { params: { id: confirmDelete } });
      setConfirmDelete(null);
      fetchData();
      addToast('success', 'Categoria excluída com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir categoria';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const categorias = tipo === 'pagar' ? pagar : receber;

  return (
    <Layout>
      <PageHeader title="Categorias" subtitle="Gerencie suas categorias">
        <ShowForPermission rota="/categorias" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Categoria
          </Button>
        </ShowForPermission>
      </PageHeader>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTipo('pagar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tipo === 'pagar' ? 'bg-accent-primary text-white' : 'bg-bg-muted text-text-secondary hover:bg-border-subtle'
          }`}
        >
          Categorias Pagar
        </button>
        <button
          onClick={() => setTipo('receber')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tipo === 'receber' ? 'bg-accent-primary text-white' : 'bg-bg-muted text-text-secondary hover:bg-border-subtle'
          }`}
        >
          Categorias Receber
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => fetchData()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={categorias} loading={loading} error={error} emptyMessage="Nenhuma categoria cadastrada" />
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Categoria' : 'Nova Categoria'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <CategoriaForm key={`categoria-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`} onSubmit={handleSubmit} onCancel={closeModal} initial={editing} tipo={tipo} />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Categoria"
        message="Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
