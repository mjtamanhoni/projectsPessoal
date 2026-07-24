import { useState, useEffect } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { UsuarioFormularioForm } from '@/components/forms/UsuarioFormularioForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import type { UsuarioFormulario, Usuario, Formulario } from '@/types';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

const columnHelper = createColumnHelper<UsuarioFormulario>();

export function UsuarioFormularios() {
  const { data: itens, loading, error, create, update, remove, fetchOne, refetch } = useApi<UsuarioFormulario>('/usuario-formularios');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioFormulario | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [formularios, setFormularios] = useState<Formulario[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/usuarios').then((r) => setUsuarios(r.data as Usuario[])),
      api.get('/formularios').then((r) => setFormularios(r.data as Formulario[])),
    ]).catch(() => {});
  }, []);

  const getUsuarioNome = (id: number) => usuarios.find((u) => u.id === id)?.nome || '-';
  const getFormularioNome = (id: number) => formularios.find((f) => f.id === id)?.nome || '-';

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Codigo',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.usuarioNome || getUsuarioNome(row.usuarioId), {
      id: 'usuario',
      header: 'Usuario',
      enableSorting: true,
    }),
    columnHelper.accessor((row) => row.formularioNome || getFormularioNome(row.formularioId), {
      id: 'formulario',
      header: 'Formulario',
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Acoes',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          <button
            onClick={() => handleEdit(row.original)}
            className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
          >
            <Edit2 size={16} className="text-text-secondary" />
          </button>
          <button
            onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
            className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors ml-1"
          >
            <Trash2 size={16} className="text-accent-red" />
          </button>
        </div>
      ),
    }),
  ];

  const handleEdit = async (item: UsuarioFormulario) => {
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

  const handleSubmit = async (data: UsuarioFormulario) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Vinculo atualizado com sucesso' : 'Vinculo cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar vinculo';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Vinculo excluido com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir vinculo';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Usuario x Formulario" subtitle="Vincule usuarios a formularios para controlar acesso">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={18} /> Novo Vinculo
        </Button>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={itens} loading={loading} error={error} emptyMessage="Nenhum vinculo cadastrado" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Vinculo' : 'Novo Vinculo'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <UsuarioFormularioForm
            key={`uf-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            usuarios={usuarios}
            formularios={formularios}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Vinculo"
        message="Tem certeza que deseja excluir este vinculo? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
