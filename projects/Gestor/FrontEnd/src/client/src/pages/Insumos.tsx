import { useState, useEffect } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { InsumoForm } from '@/components/forms/InsumoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Insumo, Fornecedor, Marca } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import api from '@/lib/api';

const columnHelper = createColumnHelper<Insumo>();

export function Insumos() {
  const { data: insumos, loading, error, create, update, remove, fetchOne, refetch } = useApi<Insumo>('/insumos');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  useEffect(() => {
    api.get<Fornecedor[]>('/fornecedores').then((r) => setFornecedores(r.data)).catch(() => {});
    api.get<Marca[]>('/marcas').then((r) => setMarcas(r.data)).catch(() => {});
  }, []);

  const fornMap = new Map((fornecedores ?? []).map((f) => [f.id ?? f.codigo, f.nome]));
  const marcaMap = new Map((marcas ?? []).map((m) => [m.id ?? m.codigo, m.nome]));

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { addToast } = useToast();
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcInsumoId, setRecalcInsumoId] = useState<number | ''>('');

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
    columnHelper.accessor('unidade_medida', {
      header: 'Unidade',
      enableSorting: true,
    }),
    columnHelper.accessor('custo_medio', {
      header: 'Custo Medio',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? Number(value).toFixed(6) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('id_fornecedor', {
      id: 'fornecedor',
      header: 'Fornecedor',
      cell: (info) => fornMap.get(info.getValue()!) ?? '-',
      enableSorting: true,
    }),
    columnHelper.accessor('id_marca', {
      id: 'marca',
      header: 'Marca',
      cell: (info) => marcaMap.get(info.getValue()!) ?? '-',
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <ShowForPermission rota="/insumos" acao={ACAO.EDITAR}>
            <button onClick={() => handleEdit(row.original)} className="p-1 rounded hover:bg-bg-muted transition-colors">
              <Edit2 size={14} className="text-text-secondary" />
            </button>
          </ShowForPermission>
          <ShowForPermission rota="/insumos" acao={ACAO.EXCLUIR}>
            <button onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)} className="p-1 rounded hover:bg-bg-muted transition-colors">
              <Trash2 size={14} className="text-accent-red" />
            </button>
          </ShowForPermission>
        </div>
      ),
      size: 60,
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

  const handleEdit = async (insumo: Insumo) => {
    const idToFetch = insumo.id || insumo.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? insumo);
    } catch {
      setEditing(insumo);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: Insumo) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
        closeModal();
        addToast('success', 'Insumo atualizado com sucesso');
      } else {
        await create(data);
        setFormKey((k) => k + 1);
        refetch();
        addToast('success', 'Insumo cadastrado com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar insumo';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Insumo excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir insumo';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleRecalcular = async (all: boolean) => {
    setRecalcLoading(true);
    try {
      const params = all ? {} : { id: recalcInsumoId };
      const res = await api.get('/insumos/recalcular', { params });
      const data = res.data as { mensagem: string; quantidade: number };
      addToast('success', `${data.mensagem} (${data.quantidade} insumos)`);
      setRecalcOpen(false);
      setRecalcInsumoId('');
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao recalcular';
      addToast('error', msg);
    } finally {
      setRecalcLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Insumos" subtitle="Gerencie seus insumos">
        <ShowForPermission rota="/insumos" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Novo Insumo
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end gap-2 mb-4">
          <button onClick={() => setRecalcOpen(true)} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Recalcular Estoque e Custo Medio">
            <RotateCcw size={18} className="text-text-secondary" />
          </button>
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={insumos} loading={loading} error={error} emptyMessage="Nenhum insumo cadastrado" />
      </Card>

      <Modal isOpen={recalcOpen} onClose={() => { setRecalcOpen(false); setRecalcInsumoId(''); }} title="Recalcular Insumos">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Recalcula o estoque (compras - produções - perdas) e o custo médio com base nos itens das compras.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => handleRecalcular(true)} disabled={recalcLoading}>
              <RotateCcw size={16} className={recalcLoading ? 'animate-spin' : ''} /> Recalcular Todos
            </Button>
            <hr className="border-border-primary" />
            <div className="space-y-2">
              <label className="label-field text-sm">Recalcular apenas um insumo:</label>
              <select
                className="input-field"
                value={recalcInsumoId}
                onChange={(e) => setRecalcInsumoId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecione...</option>
                {insumos.map((i) => {
                  const marcaNome = i.marca_nome || marcas.find((m) => (m.id ?? m.codigo) === i.id_marca)?.nome;
                  return <option key={i.id ?? i.codigo} value={i.id ?? i.codigo}>{i.nome}{marcaNome ? ` (${marcaNome})` : ''}</option>;
                })}
              </select>
              <Button
                onClick={() => handleRecalcular(false)}
                disabled={recalcLoading || !recalcInsumoId}
              >
                <RotateCcw size={16} className={recalcLoading ? 'animate-spin' : ''} /> Recalcular Selecionado
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Insumo' : 'Novo Insumo'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <InsumoForm
            key={`insumo-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
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
        title="Excluir Insumo"
        message="Tem certeza que deseja excluir este insumo? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
