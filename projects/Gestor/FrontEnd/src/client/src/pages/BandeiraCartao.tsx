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
import { BandeiraCartaoForm } from '@/components/forms/BandeiraCartaoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { BandeiraCartao } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';

const columnHelper = createColumnHelper<BandeiraCartao>();

export function BandeiraCartaoPage() {
  const { data: bandeiras, loading, error, create, update, remove, fetchOne, refetch } = useApi<BandeiraCartao>('/bandeiras-cartao');
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatusAtivo>('1');

  const bandeirasFiltradas = useMemo(
    () =>
      (bandeiras ?? []).filter(
        (b) => passaStatusAtivo(b.status === 1, filtroAtivo) && passaBusca([b.nome], busca),
      ),
    [bandeiras, filtroAtivo, busca],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BandeiraCartao | null>(null);
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
    columnHelper.accessor('nome', { header: 'Nome', enableSorting: true }),
    columnHelper.accessor('imagem', {
      header: 'Imagem',
      cell: (info) => {
        const img = info.getValue();
        if (!img) return <span className="text-text-muted">-</span>;
        return <img src={img} alt="" className="h-8 w-auto object-contain" />;
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => info.getValue() === 1 ? <span className="text-accent-green">Ativo</span> : <span className="text-accent-red">Inativo</span>,
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
            rota="/bandeiras-cartao"
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

  const handleEdit = async (bandeira: BandeiraCartao) => {
    const idToFetch = bandeira.id || bandeira.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? bandeira);
    } catch {
      setEditing(bandeira);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: BandeiraCartao) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
        closeModal();
        addToast('success', 'Bandeira de cartao atualizada com sucesso');
      } else {
        await create(data);
        setFormKey((k) => k + 1);
        refetch();
        addToast('success', 'Bandeira de cartao cadastrada com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar bandeira de cartao';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Bandeira de cartao excluida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir bandeira de cartao';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Bandeiras de Cartao" subtitle="Cadastro de bandeiras de cartao">
        <ShowForPermission rota="/bandeiras-cartao" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Bandeira
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
        <DataTable columns={columns} data={bandeirasFiltradas} loading={loading} error={error} emptyMessage="Nenhuma bandeira de cartao cadastrada" />
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Bandeira de Cartao' : 'Nova Bandeira de Cartao'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <BandeiraCartaoForm
            key={`bandeira-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
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
        title="Excluir Bandeira de Cartao"
        message="Tem certeza que deseja excluir esta bandeira de cartao?"
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
