import { useState, useEffect } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { LancamentoAutomaticoConfigForm } from '@/components/forms/LancamentoAutomaticoConfigForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { LancamentoAutomaticoConfig, Categoria } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import api from '@/lib/api';

const origemLabels: Record<string, string> = {
  venda_produto: 'Venda de Produto Fabricado',
  compra_insumo: 'Compra de Insumo',
  servico: 'Servico Prestado',
};

const columnHelper = createColumnHelper<LancamentoAutomaticoConfig>();

export function LancamentoAutomaticoConfigPage() {
  const { data: configs, loading, error, create, update, remove, fetchOne, refetch } = useApi<LancamentoAutomaticoConfig>('/lancamento-automatico-config');
  const [categoriasPagar, setCategoriasPagar] = useState<Categoria[]>([]);
  const [categoriasReceber, setCategoriasReceber] = useState<Categoria[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LancamentoAutomaticoConfig | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/categorias/pagar'),
      api.get('/categorias/receber'),
    ]).then(([pagar, receber]) => {
      setCategoriasPagar(Array.isArray(pagar.data) ? pagar.data : []);
      setCategoriasReceber(Array.isArray(receber.data) ? receber.data : []);
    }).catch(() => {});
  }, []);

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Codigo',
      enableSorting: true,
    }),
    columnHelper.accessor('tipo_origem', {
      header: 'Origem',
      cell: (info) => origemLabels[info.getValue()] || info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('tipo_lancamento', {
      header: 'Tipo',
      cell: (info) => info.getValue() === 'pagar' ? 'Contas a Pagar' : 'Contas a Receber',
      enableSorting: true,
    }),
    columnHelper.accessor('categoria_id', {
      header: 'Categoria ID',
      enableSorting: true,
    }),
    columnHelper.accessor('dias_vencimento', {
      header: 'Dias Venc.',
      enableSorting: true,
    }),
    columnHelper.accessor('ativo', {
      header: 'Ativo',
      cell: (info) => (info.getValue() ? 'Sim' : 'Nao'),
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
            rota="/lancamento-automatico-config"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (c: LancamentoAutomaticoConfig) => {
    const idToFetch = c.id || c.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? c);
    } catch {
      setEditing(c);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: LancamentoAutomaticoConfig) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Configuracao atualizada com sucesso' : 'Configuracao cadastrada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar configuracao';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Configuracao excluida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir configuracao';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Lancamentos Automaticos" subtitle="Configure as categorias para lancamentos automaticos no financeiro">
        <ShowForPermission rota="/lancamento-automatico-config" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Nova Configuracao
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={configs} loading={loading} error={error} emptyMessage="Nenhuma configuracao cadastrada" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Configuracao' : 'Nova Configuracao'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <LancamentoAutomaticoConfigForm
            key={`lac-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            categoriasPagar={categoriasPagar}
            categoriasReceber={categoriasReceber}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Configuracao"
        message="Tem certeza que deseja excluir esta configuracao?"
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
