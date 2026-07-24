import { useState, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { FabricacaoForm } from '@/components/forms/FabricacaoForm';
import { FabricacaoCustoAdicionalForm } from '@/components/forms/FabricacaoCustoAdicionalForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Fabricacao, ProdutoFabricado, FabricacaoCustoAdicional, CustoAdicionalTipo } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';

const columnHelper = createColumnHelper<Fabricacao>();

export function Fabricacoes() {
  const { data: fabricacoes, loading, error, create, update, remove, fetchOne, refetch } = useApi<Fabricacao>('/fabricacoes');
  const { data: produtos } = useApi<ProdutoFabricado>('/produtos-fabricados');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fabricacao | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const [custosAdicionais, setCustosAdicionais] = useState<Record<number, FabricacaoCustoAdicional[]>>({});
  const [loadingCustos, setLoadingCustos] = useState<Set<number>>(new Set());
  const [caModalOpen, setCaModalOpen] = useState(false);
  const [caEditing, setCaEditing] = useState<FabricacaoCustoAdicional | null>(null);
  const [caFabricacaoId, setCaFabricacaoId] = useState<number | null>(null);
  const [confirmDeleteCa, setConfirmDeleteCa] = useState<number | null>(null);
  const [deletingCa, setDeletingCa] = useState(false);
  const [tiposCusto, setTiposCusto] = useState<CustoAdicionalTipo[]>([]);

  const tipoCustoMap: Record<number, CustoAdicionalTipo> = {};
  for (const t of tiposCusto) {
    const id = t.id ?? t.codigo;
    if (id) tipoCustoMap[id] = t;
  }

  if (tiposCusto.length === 0) {
    api.get<CustoAdicionalTipo[]>('/custos-adicionais-tipo').then((r) => setTiposCusto(r.data)).catch(() => {});
  }

  const fetchCustosAdicionais = useCallback(async (fabricacaoId: number) => {
    if (loadingCustos.has(fabricacaoId)) return;
    setLoadingCustos((prev) => new Set(prev).add(fabricacaoId));
    try {
      const res = await api.get('/fabricacao-custos-adicionais', { params: { fabricacao_id: fabricacaoId } });
      setCustosAdicionais((prev) => ({ ...prev, [fabricacaoId]: res.data as FabricacaoCustoAdicional[] }));
    } catch {
      setCustosAdicionais((prev) => ({ ...prev, [fabricacaoId]: [] }));
    } finally {
      setLoadingCustos((prev) => { const next = new Set(prev); next.delete(fabricacaoId); return next; });
    }
  }, [loadingCustos]);

  const columns = [
    columnHelper.display({
      id: 'expand',
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 40,
      meta: { expand: true } as Record<string, unknown>,
    }),
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Código',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('produto_nome', {
      header: 'Produto',
      enableSorting: true,
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('quantidade_produzida', {
      header: 'Quantidade',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? Number(value).toFixed(2) : '-';
      },
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('custo_insumos', {
      header: 'Custo Insumos',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatCurrency(Number(value)) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('custo_adicional_total', {
      header: 'Custo Adic.',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatCurrency(Number(value)) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('custo_total', {
      header: 'Custo Total',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatCurrency(Number(value)) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('custo_unitario', {
      header: 'Custo Unit.',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatCurrency(Number(value)) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('data_fabricacao', {
      header: 'Data',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-0.5">
          <ShowForPermission rota="/fabricacoes" acao={ACAO.EDITAR}>
            <button onClick={() => handleEdit(row.original)} className="p-1 rounded hover:bg-bg-muted transition-colors">
              <Edit2 size={14} className="text-text-secondary" />
            </button>
          </ShowForPermission>
          <ShowForPermission rota="/fabricacoes" acao={ACAO.EXCLUIR}>
            <button onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)} className="p-1 rounded hover:bg-bg-muted transition-colors">
              <Trash2 size={14} className="text-accent-red" />
            </button>
          </ShowForPermission>
        </div>
      ),
    }),
  ];

  const handleEdit = async (fabricacao: Fabricacao) => {
    const idToFetch = fabricacao.id || fabricacao.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? fabricacao);
    } catch {
      setEditing(fabricacao);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: Fabricacao) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Fabricacao atualizada com sucesso' : 'Fabricacao cadastrada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar fabricacao';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Fabricacao excluída com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir fabricacao';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCaSubmit = async (data: FabricacaoCustoAdicional) => {
    try {
      if (caEditing) {
        await api.post('/fabricacao-custos-adicionais', { ...data, id: caEditing.id ?? caEditing.codigo });
      } else {
        await api.post('/fabricacao-custos-adicionais', data);
      }
      const fid = caFabricacaoId ?? data.fabricacao_id;
      setCaModalOpen(false);
      setCaEditing(null);
      setCaFabricacaoId(null);
      if (fid) {
        await fetchCustosAdicionais(fid);
        refetch();
      }
      addToast('success', caEditing ? 'Custo atualizado com sucesso' : 'Custo cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar custo';
      addToast('error', msg);
    }
  };

  const handleDeleteCa = async () => {
    if (confirmDeleteCa === null) return;
    setDeletingCa(true);
    try {
      await api.delete('/fabricacao-custos-adicionais', { params: { id: confirmDeleteCa } });
      const fid = caFabricacaoId;
      setConfirmDeleteCa(null);
      if (fid) {
        await fetchCustosAdicionais(fid);
        refetch();
      }
      addToast('success', 'Custo excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir custo';
      addToast('error', msg);
    } finally {
      setDeletingCa(false);
    }
  };

  const renderSubComponent = (fabricacao: Fabricacao) => {
    const fid = fabricacao.id ?? fabricacao.codigo;
    if (!fid) return <></>;
    const list = custosAdicionais[fid];
    const loading = loadingCustos.has(fid);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Custos Adicionais</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchCustosAdicionais(fid)} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
              <RefreshCw size={14} className="text-text-secondary" />
            </button>
            <ShowForPermission rota="/fabricacoes" acao={ACAO.INCLUIR}>
              <button onClick={() => { setCaEditing(null); setCaFabricacaoId(fid); setCaModalOpen(true); }} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                <Plus size={14} /> Adicionar
              </button>
            </ShowForPermission>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-primary" />
          </div>
        ) : !list || list.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">Nenhum custo adicional cadastrado</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2 w-12">Cód</th>
                <th className="text-left text-xs font-medium text-text-muted py-2 px-2">Tipo de Custo</th>
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2">Valor</th>
                <th className="text-center text-xs font-medium text-text-muted py-2 px-2 w-14">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const itemId = item.id ?? item.codigo;
                const tipo = tipoCustoMap[item.custo_adicional_tipo_id];
                return (
                  <tr key={itemId} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                    <td className="text-text-secondary py-1.5 px-2 text-right text-xs">{itemId}</td>
                    <td className="text-text-primary py-1.5 px-2">{tipo?.nome || item.custo_adicional_nome || '-'}</td>
                    <td className="text-text-primary py-1.5 px-2 text-right font-medium">{formatCurrency(Number(item.valor))}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <ShowForPermission rota="/fabricacoes" acao={ACAO.EDITAR}>
                          <button onClick={() => { setCaEditing(item); setCaFabricacaoId(fid); setCaModalOpen(true); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
                            <Edit2 size={12} className="text-text-secondary" />
                          </button>
                        </ShowForPermission>
                        <ShowForPermission rota="/fabricacoes" acao={ACAO.EXCLUIR}>
                          <button onClick={() => { setConfirmDeleteCa(itemId!); setCaFabricacaoId(fid); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
                            <Trash2 size={12} className="text-accent-red" />
                          </button>
                        </ShowForPermission>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <PageHeader title="Fabricacoes" subtitle="Gerencie as fabricacoes">
        <ShowForPermission rota="/fabricacoes" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Nova Fabricacao
          </Button>
        </ShowForPermission>
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={fabricacoes} loading={loading} error={error} emptyMessage="Nenhuma fabricacao cadastrada" renderSubComponent={renderSubComponent} />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Fabricacao' : 'Nova Fabricacao'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <FabricacaoForm
            key={`fabricacao-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            produtos={produtos}
          />
        )}
      </Modal>

      <Modal isOpen={caModalOpen} onClose={() => { setCaModalOpen(false); setCaEditing(null); setCaFabricacaoId(null); }} title={caEditing ? 'Editar Custo Adicional' : 'Novo Custo Adicional'}>
        <FabricacaoCustoAdicionalForm
          key={`ca-form-${caEditing?.id ?? caEditing?.codigo ?? 'new'}`}
          onSubmit={handleCaSubmit}
          onCancel={() => { setCaModalOpen(false); setCaEditing(null); setCaFabricacaoId(null); }}
          initial={caEditing}
          fabricacaoId={caFabricacaoId!}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Fabricacao"
        message="Tem certeza que deseja excluir esta fabricacao? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={confirmDeleteCa !== null}
        onClose={() => setConfirmDeleteCa(null)}
        onConfirm={handleDeleteCa}
        title="Excluir Custo Adicional"
        message="Tem certeza que deseja excluir este custo adicional? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deletingCa}
      />
    </Layout>
  );
}
