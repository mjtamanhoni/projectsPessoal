import { useMemo, useState, useCallback } from 'react';
import { PaginaFiltros } from '@/components/ui/PaginaFiltros';
import { passaBusca, passaStatusAtivo } from '@/lib/filtros';
import type { FiltroStatusAtivo } from '@/lib/filtros';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { ProdutoVendaForm } from '@/components/forms/ProdutoVendaForm';
import type { FotoPayload } from '@/components/forms/ProdutoFabricadoForm';
import { ProdutoVendaItemForm } from '@/components/forms/ProdutoVendaItemForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { ProdutoVenda, ProdutoVendaItem } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

const columnHelper = createColumnHelper<ProdutoVenda>();

function BadgeItem({ rotulo, ativo }: { rotulo: string; ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
        ativo ? 'bg-accent-primary/10 text-accent-primary' : 'bg-bg-muted text-text-muted'
      }`}
    >
      {rotulo}
    </span>
  );
}

export function ProdutosVenda() {
  const { data: produtos, loading, error, create, update, remove, fetchOne, refetch } = useApi<ProdutoVenda>('/produtos-venda');
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatusAtivo>('1');

  const produtosFiltrados = useMemo(
    () =>
      (produtos ?? []).filter(
        (p) => passaStatusAtivo(p.ativo, filtroAtivo) && passaBusca([p.nome, p.descricao ?? ''], busca),
      ),
    [produtos, filtroAtivo, busca],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoVenda | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const [itens, setItens] = useState<Record<number, ProdutoVendaItem[]>>({});
  const [loadingItens, setLoadingItens] = useState<Set<number>>(new Set());
  const [piModalOpen, setPiModalOpen] = useState(false);
  const [piEditing, setPiEditing] = useState<ProdutoVendaItem | null>(null);
  const [piProdutoId, setPiProdutoId] = useState<number | null>(null);
  const [confirmDeletePi, setConfirmDeletePi] = useState<number | null>(null);
  const [deletingPi, setDeletingPi] = useState(false);

  const fetchItens = useCallback(async (produtoVendaId: number) => {
    if (loadingItens.has(produtoVendaId)) return;
    setLoadingItens((prev) => new Set(prev).add(produtoVendaId));
    try {
      const res = await api.get('/produtos-venda-itens', { params: { produto_venda_id: produtoVendaId } });
      setItens((prev) => ({ ...prev, [produtoVendaId]: res.data as ProdutoVendaItem[] }));
    } catch {
      setItens((prev) => ({ ...prev, [produtoVendaId]: [] }));
    } finally {
      setLoadingItens((prev) => { const next = new Set(prev); next.delete(produtoVendaId); return next; });
    }
  }, [loadingItens]);

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
    columnHelper.accessor('nome', {
      header: 'Nome',
      enableSorting: true,
    }),
    columnHelper.accessor('produto_fabricado_nome', {
      header: 'Origem',
      cell: (info) => info.getValue() ?? '-',
    }),
    columnHelper.accessor('preco', {
      header: 'Preço',
      cell: (info) => formatCurrency(Number(info.getValue() ?? 0)),
      meta: { align: 'right' } as Record<string, string>,
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
            rota="/produtos-venda"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (produto: ProdutoVenda) => {
    const idToFetch = produto.id || produto.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? produto);
    } catch {
      setEditing(produto);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: ProdutoVenda, foto?: FotoPayload) => {
    try {
      let produtoId = editing?.id ?? editing?.codigo;
      const res = editing
        ? await update({ ...data, id: editing.id ?? editing.codigo })
        : await create(data);
      const ids = (res as { ids?: number[] } | undefined)?.ids;
      if (ids && ids.length > 0) produtoId = ids[0];
      if (produtoId && foto) {
        if (foto.dataUrl) {
          await api.post('/produtos-venda/foto', { id: produtoId, foto: foto.dataUrl });
        } else if (foto.remover) {
          await api.post('/produtos-venda/foto', { id: produtoId, foto: '' });
        }
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Produto atualizado com sucesso' : 'Produto cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar produto';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      setItens((prev) => { const next = { ...prev }; delete next[confirmDelete]; return next; });
      addToast('success', 'Produto excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir produto';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handlePiSubmit = async (data: ProdutoVendaItem) => {
    try {
      if (piEditing) {
        await api.post('/produtos-venda-itens', { ...data, id: piEditing.id ?? piEditing.codigo });
      } else {
        await api.post('/produtos-venda-itens', data);
      }
      const pid = piProdutoId ?? data.produto_venda_id;
      setPiModalOpen(false);
      setPiEditing(null);
      setPiProdutoId(null);
      if (pid) await fetchItens(pid);
      addToast('success', piEditing ? 'Item atualizado com sucesso' : 'Item cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar item';
      addToast('error', msg);
    }
  };

  const handleDeletePi = async () => {
    if (confirmDeletePi === null) return;
    setDeletingPi(true);
    try {
      await api.delete('/produtos-venda-itens', { params: { id: confirmDeletePi } });
      const pid = piProdutoId;
      setConfirmDeletePi(null);
      if (pid) await fetchItens(pid);
      addToast('success', 'Item excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir item';
      addToast('error', msg);
    } finally {
      setDeletingPi(false);
    }
  };

  const renderSubComponent = (produto: ProdutoVenda) => {
    const pid = produto.id ?? produto.codigo;
    if (!pid) return <></>;
    const list = itens[pid];
    const loading = loadingItens.has(pid);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Itens do Produto de Venda</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchItens(pid)} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
              <RefreshCw size={14} className="text-text-secondary" />
            </button>
            <ShowForPermission rota="/produtos-venda" acao={ACAO.INCLUIR}>
              <button onClick={() => { setPiEditing(null); setPiProdutoId(pid); setPiModalOpen(true); }} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
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
          <p className="text-sm text-text-muted text-center py-4">Nenhum item cadastrado para este produto</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2 w-12">Cód</th>
                <th className="text-left text-xs font-medium text-text-muted py-2 px-2">Item</th>
                <th className="text-center text-xs font-medium text-text-muted py-2 px-2">Remover</th>
                <th className="text-center text-xs font-medium text-text-muted py-2 px-2">Adicionar</th>
                <th className="text-left text-xs font-medium text-text-muted py-2 px-2">Adicional de Preço</th>
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2 w-14">Ordem</th>
                <th className="text-center text-xs font-medium text-text-muted py-2 px-2 w-14">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const itemId = item.id ?? item.codigo;
                return (
                  <tr key={itemId} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                    <td className="text-text-secondary py-1.5 px-2 text-right text-xs">{itemId}</td>
                    <td className="text-text-primary py-1.5 px-2">{item.nome}</td>
                    <td className="py-1.5 px-2 text-center"><BadgeItem rotulo="Remover" ativo={Boolean(item.pode_remover)} /></td>
                    <td className="py-1.5 px-2 text-center"><BadgeItem rotulo="Adicionar" ativo={Boolean(item.pode_adicionar)} /></td>
                    <td className="text-text-primary py-1.5 px-2">{item.adicional_nome ? `${item.adicional_nome} — ${formatCurrency(Number(item.adicional_preco ?? 0))}` : <span className="text-text-muted">Grátis</span>}</td>
                    <td className="text-text-secondary py-1.5 px-2 text-right text-xs">{item.ordem ?? 0}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <ShowForPermission rota="/produtos-venda" acao={ACAO.EDITAR}>
                          <button onClick={() => { setPiEditing(item); setPiProdutoId(pid); setPiModalOpen(true); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
                            <Edit2 size={12} className="text-text-secondary" />
                          </button>
                        </ShowForPermission>
                        <ShowForPermission rota="/produtos-venda" acao={ACAO.EXCLUIR}>
                          <button onClick={() => { setConfirmDeletePi(itemId!); setPiProdutoId(pid); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
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
      <PageHeader title="Produtos de Venda" subtitle="Produtos comercializáveis com itens removíveis/adicionáveis">
        <ShowForPermission rota="/produtos-venda" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Produto
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
          busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar por nome ou descrição...' }}
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
        <DataTable columns={columns} data={produtosFiltrados} loading={loading} error={error} emptyMessage="Nenhum produto de venda cadastrado" renderSubComponent={renderSubComponent} />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Produto de Venda' : 'Novo Produto de Venda'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <ProdutoVendaForm
            key={`produto-venda-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
          />
        )}
      </Modal>

      <Modal isOpen={piModalOpen} onClose={() => { setPiModalOpen(false); setPiEditing(null); setPiProdutoId(null); }} title={piEditing ? 'Editar Item' : 'Novo Item'}>
        <ProdutoVendaItemForm
          key={`pvi-form-${piEditing?.id ?? piEditing?.codigo ?? 'new'}`}
          onSubmit={handlePiSubmit}
          onCancel={() => { setPiModalOpen(false); setPiEditing(null); setPiProdutoId(null); }}
          initial={piEditing}
          produtoVendaId={piProdutoId ?? undefined}
          ordemInicial={piEditing ? undefined : (itens[piProdutoId ?? 0] ?? []).reduce((m, i) => Math.max(m, i.ordem ?? 0), 0) + 1}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Produto de Venda"
        message="Tem certeza que deseja excluir este produto de venda? Os itens vinculados também serão excluídos."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={confirmDeletePi !== null}
        onClose={() => setConfirmDeletePi(null)}
        onConfirm={handleDeletePi}
        title="Excluir Item"
        message="Tem certeza que deseja excluir este item?"
        variant="danger"
        confirmLabel="Excluir"
        loading={deletingPi}
      />
    </Layout>
  );
}