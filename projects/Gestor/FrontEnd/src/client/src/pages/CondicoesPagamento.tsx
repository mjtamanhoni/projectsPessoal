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
import { CondicaoPagamentoForm } from '@/components/forms/CondicaoPagamentoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { CondicaoPagamento } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';

const columnHelper = createColumnHelper<CondicaoPagamento>();

export function CondicoesPagamento() {
  const { data, loading, error, create, update, remove, fetchOne, refetch } = useApi<CondicaoPagamento>('/condicoes-pagamento');
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatusAtivo>('1');

  const filtrados = useMemo(
    () =>
      (data ?? []).filter(
        (item) => passaStatusAtivo(item.status === 1, filtroAtivo) && passaBusca([item.descricao], busca),
      ),
    [data, filtroAtivo, busca],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CondicaoPagamento | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
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
    columnHelper.accessor('descricao', { header: 'Descricao', enableSorting: true }),
    columnHelper.accessor('a_vista', {
      header: 'A Vista',
      cell: (info) => info.getValue() === 1 ? <span className="text-accent-green font-medium">Sim</span> : <span className="text-text-muted">Nao</span>,
      meta: { align: 'center' } as Record<string, string>,
    }),
    columnHelper.accessor('qtd_parcelas', {
      header: 'Parcelas',
      meta: { align: 'center' } as Record<string, string>,
      cell: (info) => {
        const row = info.row.original;
        if (row.a_vista === 1) return <span className="text-text-muted">-</span>;
        return info.getValue();
      },
    }),
    columnHelper.accessor('dias_primeiro_vencimento', {
      header: '1o Venc.',
      meta: { align: 'center' } as Record<string, string>,
      cell: (info) => {
        const row = info.row.original;
        if (row.a_vista === 1) return <span className="text-text-muted">-</span>;
        return info.getValue();
      },
    }),
    columnHelper.accessor('dias_intervalo', {
      header: 'Intervalo',
      meta: { align: 'center' } as Record<string, string>,
      cell: (info) => {
        const row = info.row.original;
        if (row.a_vista === 1) return <span className="text-text-muted">-</span>;
        return info.getValue();
      },
    }),
    columnHelper.accessor('status', {
      header: 'Ativo',
      cell: (info) => info.getValue() === 1 ? <span className="text-accent-green">Sim</span> : <span className="text-accent-red">Nao</span>,
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
            rota="/condicoes-pagamento"
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

  const handleEdit = async (item: CondicaoPagamento) => {
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

  const handleSubmit = async (formData: CondicaoPagamento) => {
    try {
      if (editing) {
        await update({ ...formData, id: editing.id ?? editing.codigo });
        closeModal();
        addToast('success', 'Condicao atualizada com sucesso');
      } else {
        await create(formData);
        setFormKey((k) => k + 1);
        refetch();
        addToast('success', 'Condicao cadastrada com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar condicao';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Condicao excluida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir condicao';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Condicoes de Pagamento" subtitle="Cadastro de condicoes de pagamento">
        <ShowForPermission rota="/condicoes-pagamento" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Condicao
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
          busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar por descricao...' }}
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
        <DataTable columns={columns} data={filtrados} loading={loading} error={error} emptyMessage="Nenhuma condicao cadastrada" />
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Condicao' : 'Nova Condicao'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <CondicaoPagamentoForm
            key={`condicao-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
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
        title="Excluir Condicao"
        message="Tem certeza que deseja excluir esta condicao?"
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
