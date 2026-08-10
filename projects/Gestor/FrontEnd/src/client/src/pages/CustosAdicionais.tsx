import { useMemo, useState } from 'react';
import { PaginaFiltros } from '@/components/ui/PaginaFiltros';
import { passaBusca, passaStatusAtivo } from '@/lib/filtros';
import type { FiltroStatusAtivo } from '@/lib/filtros';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { CustoAdicionalTipoForm } from '@/components/forms/CustoAdicionalTipoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { CustoAdicionalTipo } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';

const columnHelper = createColumnHelper<CustoAdicionalTipo>();

export function CustosAdicionais() {
  const { data: tipos, loading, error, create, update, remove, fetchOne, refetch } = useApi<CustoAdicionalTipo>('/custos-adicionais-tipo');
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatusAtivo>('1');

  const tiposFiltrados = useMemo(
    () =>
      (tipos ?? []).filter(
        (t) => passaStatusAtivo(t.ativo, filtroAtivo) && passaBusca([t.nome], busca),
      ),
    [tipos, filtroAtivo, busca],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustoAdicionalTipo | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    columnHelper.accessor('ativo', {
      header: 'Ativo',
      cell: (info) => (info.getValue() ? 'Sim' : 'Não'),
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
            rota="/custos-adicionais"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (tipo: CustoAdicionalTipo) => {
    const idToFetch = tipo.id || tipo.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? tipo);
    } catch {
      setEditing(tipo);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: CustoAdicionalTipo) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Tipo de custo atualizado com sucesso' : 'Tipo de custo cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar tipo de custo';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Tipo de custo excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir tipo de custo';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Custos Adicionais" subtitle="Gerencie tipos de custos adicionais">
        <ShowForPermission rota="/custos-adicionais" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Tipo
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <PaginaFiltros
          busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar por nome...' }}
          status={{
            rotulo: 'Status',
            valor: filtroAtivo,
            opcoes: [
              { valor: '1', label: 'Ativos' },
              { valor: '0', label: 'Inativos' },
              { valor: 'todos', label: 'Todos' },
            ],
            onChange: (v) => setFiltroAtivo(v as FiltroStatusAtivo),
          }}
          onLimpar={() => {
            setBusca('');
            setFiltroAtivo('1');
          }}
        />
        <DataTable columns={columns} data={tiposFiltrados} loading={loading} error={error} emptyMessage="Nenhum tipo de custo cadastrado" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Tipo de Custo' : 'Novo Tipo de Custo'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <CustoAdicionalTipoForm
            key={`custo-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
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
        title="Excluir Tipo de Custo"
        message="Tem certeza que deseja excluir este tipo de custo? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
