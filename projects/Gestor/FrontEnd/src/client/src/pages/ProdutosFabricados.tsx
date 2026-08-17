import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { PaginaFiltros } from '@/components/ui/PaginaFiltros';
import { passaBusca, passaStatusAtivo } from '@/lib/filtros';
import type { FiltroStatusAtivo } from '@/lib/filtros';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { ProdutoFabricadoForm, FotoPayload } from '@/components/forms/ProdutoFabricadoForm';
import { ReceitaIngredienteForm } from '@/components/forms/ReceitaIngredienteForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { ProdutoFabricado, ReceitaIngrediente, Insumo, Fabricacao, Adicional, ProdutoAdicional } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

const columnHelper = createColumnHelper<ProdutoFabricado>();

const DP_6 = 6;
const DP_2 = 2;

export function ProdutosFabricados() {
  const { data: produtos, loading, error, create, update, remove, fetchOne, refetch } = useApi<ProdutoFabricado>('/produtos-fabricados');
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatusAtivo>('1');

  const produtosFiltrados = useMemo(
    () =>
      (produtos ?? []).filter(
        (p) => passaStatusAtivo(p.ativo, filtroAtivo) && passaBusca([p.nome], busca),
      ),
    [produtos, filtroAtivo, busca],
  );
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const insumoMap = useRef<Record<number, Insumo>>({});

  useEffect(() => {
    api.get<Insumo[]>('/insumos').then((r) => {
      setInsumos(r.data);
      insumoMap.current = {};
      for (const ins of r.data) {
        const id = ins.id ?? ins.codigo;
        if (id) insumoMap.current[id] = ins;
      }
    }).catch(() => {});
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoFabricado | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const [ingredientes, setIngredientes] = useState<Record<number, ReceitaIngrediente[]>>({});
  const [loadingIngredientes, setLoadingIngredientes] = useState<Set<number>>(new Set());
  const [riModalOpen, setRiModalOpen] = useState(false);
  const [riEditing, setRiEditing] = useState<ReceitaIngrediente | null>(null);
  const [riProdutoId, setRiProdutoId] = useState<number | null>(null);
  const [confirmDeleteRi, setConfirmDeleteRi] = useState<number | null>(null);
  const [deletingRi, setDeletingRi] = useState(false);

  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<Adicional[]>([]);
  const [adicionaisProduto, setAdicionaisProduto] = useState<Record<number, Set<number>>>({});
  const [loadingAdicionais, setLoadingAdicionais] = useState<Set<number>>(new Set());
  const [salvandoAdicionais, setSalvandoAdicionais] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.get<Adicional[]>('/adicionais').then((r) => {
      setAdicionaisDisponiveis(r.data.filter((a) => Boolean(a.ativo)));
    }).catch(() => {});
  }, []);

  const fetchAdicionaisDoProduto = useCallback(async (produtoId: number) => {
    setLoadingAdicionais((prev) => new Set(prev).add(produtoId));
    try {
      const res = await api.get('/produtos-adicionais', { params: { produto_fabricado_id: produtoId } });
      const items = res.data as ProdutoAdicional[];
      const ids = new Set<number>();
      for (const it of items) {
        if (it.adicional_id) ids.add(it.adicional_id);
      }
      setAdicionaisProduto((prev) => ({ ...prev, [produtoId]: ids }));
    } catch {
      setAdicionaisProduto((prev) => ({ ...prev, [produtoId]: new Set<number>() }));
    } finally {
      setLoadingAdicionais((prev) => {
        const next = new Set(prev);
        next.delete(produtoId);
        return next;
      });
    }
  }, []);

  const toggleAdicional = async (produtoId: number, adicionalId: number) => {
    const atual = adicionaisProduto[produtoId] ?? new Set<number>();
    const proximo = new Set(atual);
    if (proximo.has(adicionalId)) {
      proximo.delete(adicionalId);
    } else {
      proximo.add(adicionalId);
    }
    setAdicionaisProduto((prev) => ({ ...prev, [produtoId]: proximo }));
    setSalvandoAdicionais((prev) => new Set(prev).add(produtoId));
    try {
      await api.post('/produtos-adicionais', { produto_fabricado_id: produtoId, adicionais: [...proximo] });
      addToast('success', 'Adicionais atualizados com sucesso');
    } catch (err: unknown) {
      setAdicionaisProduto((prev) => ({ ...prev, [produtoId]: atual }));
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar adicionais';
      addToast('error', msg);
    } finally {
      setSalvandoAdicionais((prev) => {
        const next = new Set(prev);
        next.delete(produtoId);
        return next;
      });
    }
  };

  const recalcularProduto = useCallback(async (produtoId: number) => {
    try {
      const [riRes, fabRes] = await Promise.all([
        api.get('/receitas-ingredientes', { params: { produto_fabricado_id: produtoId } }),
        api.get('/fabricacoes', { params: { produto_fabricado_id: produtoId } }),
      ]);
      const items = riRes.data as ReceitaIngrediente[];
      const custoInsumos = items.reduce((sum, item) => {
        const custoMedio = item.insumo_custo_medio ?? insumoMap.current[item.insumo_id]?.custo_medio ?? 0;
        return sum + (Number(item.quantidade) * Number(custoMedio));
      }, 0);
      const fabricacoes: Fabricacao[] = fabRes.data as Fabricacao[];
      let totalAdicional = 0;
      let totalProduzido = 0;
      for (const fab of fabricacoes) {
        totalAdicional += Number(fab.custo_adicional_total ?? 0);
        totalProduzido += Number(fab.quantidade_produzida ?? 0);
      }
      const custoAdicionalUnitario = totalProduzido > 0 ? totalAdicional / totalProduzido : 0;
      const custoFinal = Math.round((custoInsumos + custoAdicionalUnitario) * 1000000) / 1000000;
      const produtoAtual = produtos.find((p) => (p.id ?? p.codigo) === produtoId);
      const margem = Number(produtoAtual?.margem_lucro ?? 0);
      const vendaSugerido = custoFinal > 0 && margem > 0
        ? Math.round(custoFinal * (1 + margem / 100) * 100) / 100
        : 0;
      await update({ ...produtoAtual, custo_unitario: custoFinal, valor_venda_sugerido: vendaSugerido, id: produtoId } as ProdutoFabricado);
    } catch {
    }
  }, [produtos, update]);

  const enrichIngredientes = useCallback((list: ReceitaIngrediente[]) => {
    return list.map((item) => {
      const ins = insumoMap.current[item.insumo_id];
      if (!ins) return item;
      return {
        ...item,
        insumo_unidade_medida: item.insumo_unidade_medida ?? ins.unidade_medida,
        insumo_custo_medio: item.insumo_custo_medio ?? ins.custo_medio,
      };
    });
  }, []);

  const fetchIngredientes = useCallback(async (produtoId: number) => {
    if (loadingIngredientes.has(produtoId)) return;
    setLoadingIngredientes((prev) => new Set(prev).add(produtoId));
    try {
      const res = await api.get('/receitas-ingredientes', { params: { produto_fabricado_id: produtoId } });
      setIngredientes((prev) => ({ ...prev, [produtoId]: enrichIngredientes(res.data as ReceitaIngrediente[]) }));
    } catch {
      setIngredientes((prev) => ({ ...prev, [produtoId]: [] }));
    } finally {
      setLoadingIngredientes((prev) => { const next = new Set(prev); next.delete(produtoId); return next; });
    }
  }, [loadingIngredientes, enrichIngredientes]);

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
    columnHelper.accessor('unidade_medida', {
      header: 'Unidade',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('rendimento', {
      header: 'Rendimento',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? Number(value).toFixed(DP_6) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('custo_unitario', {
      header: 'Custo Unitario',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? Number(value).toFixed(DP_6) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('margem_lucro', {
      header: 'Margem (%)',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? `${Number(value).toFixed(DP_2)}%` : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('valor_venda_sugerido', {
      header: 'Venda Sugerido',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatCurrency(Number(value)) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('preco', {
      header: 'Preco',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? formatCurrency(Number(value)) : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
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
            rota="/produtos-fabricados"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (produto: ProdutoFabricado) => {
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

  const handleSubmit = async (data: ProdutoFabricado, foto?: FotoPayload) => {
    try {
      let produtoId = editing?.id ?? editing?.codigo;
      const res = editing
        ? await update({ ...data, id: editing.id ?? editing.codigo })
        : await create(data);
      const ids = (res as { ids?: number[] } | undefined)?.ids;
      if (ids && ids.length > 0) produtoId = ids[0];
      if (produtoId && foto) {
        if (foto.dataUrl) {
          await api.post('/produtos-fabricados/foto', { id: produtoId, foto: foto.dataUrl });
        } else if (foto.remover) {
          await api.post('/produtos-fabricados/foto', { id: produtoId, foto: '' });
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
      addToast('success', 'Produto excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir produto';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleRiSubmit = async (data: ReceitaIngrediente) => {
    try {
      if (riEditing) {
        await api.post('/receitas-ingredientes', { ...data, id: riEditing.id ?? riEditing.codigo });
      } else {
        await api.post('/receitas-ingredientes', data);
      }
      const pid = riProdutoId ?? data.produto_fabricado_id;
      setRiModalOpen(false);
      setRiEditing(null);
      setRiProdutoId(null);
      if (pid) {
        await fetchIngredientes(pid);
        recalcularProduto(pid);
      }
      addToast('success', riEditing ? 'Ingrediente atualizado com sucesso' : 'Ingrediente cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar ingrediente';
      addToast('error', msg);
    }
  };

  const handleDeleteRi = async () => {
    if (confirmDeleteRi === null) return;
    setDeletingRi(true);
    try {
      await api.delete('/receitas-ingredientes', { params: { id: confirmDeleteRi } });
      const pid = riProdutoId;
      setConfirmDeleteRi(null);
      if (pid) {
        await fetchIngredientes(pid);
        recalcularProduto(pid);
      }
      addToast('success', 'Ingrediente excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir ingrediente';
      addToast('error', msg);
    } finally {
      setDeletingRi(false);
    }
  };

  const renderSubComponent = (produto: ProdutoFabricado) => {
    const pid = produto.id ?? produto.codigo;
    if (!pid) return <></>;
    const list = ingredientes[pid];
    const loading = loadingIngredientes.has(pid);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Ingredientes da Receita</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchIngredientes(pid)} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
              <RefreshCw size={14} className="text-text-secondary" />
            </button>
            <ShowForPermission rota="/receitas-ingredientes" acao={ACAO.INCLUIR}>
              <button onClick={() => { setRiEditing(null); setRiProdutoId(pid); setRiModalOpen(true); }} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
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
          <p className="text-sm text-text-muted text-center py-4">Nenhum ingrediente cadastrado para este produto</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2 w-12">Cód</th>
                <th className="text-left text-xs font-medium text-text-muted py-2 px-2">Insumo</th>
                <th className="text-center text-xs font-medium text-text-muted py-2 px-2 w-16">Un</th>
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2">Quantidade</th>
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2">Custo Med.</th>
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2">Valor Gasto</th>
                <th className="text-center text-xs font-medium text-text-muted py-2 px-2 w-14">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const itemId = item.id ?? item.codigo;
                const custoMedio = item.insumo_custo_medio ?? 0;
                const quantidade = Number(item.quantidade);
                const valorGasto = quantidade * Number(custoMedio);
                return (
                  <tr key={itemId} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                    <td className="text-text-secondary py-1.5 px-2 text-right text-xs">{itemId}</td>
                    <td className="text-text-primary py-1.5 px-2">
                      <span className={!item.insumo_ativo ? 'text-accent-red line-through' : ''}>
                        {item.insumo_nome || '-'}
                        {!item.insumo_ativo && <span className="ml-1 text-xs bg-accent-red/10 text-accent-red px-1 py-0.5 rounded">Inativo</span>}
                      </span>
                    </td>
                    <td className="text-text-muted py-1.5 px-2 text-center text-xs">{item.insumo_unidade_medida || '-'}</td>
                    <td className="text-text-primary py-1.5 px-2 text-right">{quantidade.toFixed(DP_6)}</td>
                    <td className="text-text-primary py-1.5 px-2 text-right">{Number(custoMedio).toFixed(DP_6)}</td>
                    <td className="text-text-primary py-1.5 px-2 text-right font-medium">{formatCurrency(valorGasto)}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <ShowForPermission rota="/receitas-ingredientes" acao={ACAO.EDITAR}>
                          <button onClick={() => { setRiEditing(item); setRiProdutoId(pid); setRiModalOpen(true); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
                            <Edit2 size={12} className="text-text-secondary" />
                          </button>
                        </ShowForPermission>
                        <ShowForPermission rota="/receitas-ingredientes" acao={ACAO.EXCLUIR}>
                          <button onClick={() => { setConfirmDeleteRi(itemId!); setRiProdutoId(pid); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
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
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Adicionais do Produto</h3>
            <button onClick={() => fetchAdicionaisDoProduto(pid)} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
              <RefreshCw size={14} className="text-text-secondary" />
            </button>
          </div>
          {loadingAdicionais.has(pid) ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-primary" />
            </div>
          ) : adicionaisDisponiveis.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">Nenhum adicional cadastrado</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {adicionaisDisponiveis.map((ad) => {
                const adId = ad.id ?? ad.codigo;
                if (!adId) return null;
                const marcado = (adicionaisProduto[pid] ?? new Set<number>()).has(adId);
                return (
                  <label
                    key={adId}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${marcado ? 'border-accent-primary bg-accent-primary/5' : 'border-border-subtle hover:bg-bg-muted/40'}`}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={salvandoAdicionais.has(pid)}
                      onChange={() => toggleAdicional(pid, adId)}
                      className="rounded border-border-subtle"
                    />
                    <span className="flex-1 truncate text-text-primary">{ad.nome}</span>
                    <span className="text-text-secondary text-xs font-medium">{formatCurrency(ad.preco ?? 0)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <PageHeader title="Produtos Fabricados" subtitle="Gerencie produtos fabricados">
        <ShowForPermission rota="/produtos-fabricados" acao={ACAO.INCLUIR}>
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
        <DataTable columns={columns} data={produtosFiltrados} loading={loading} error={error} emptyMessage="Nenhum produto cadastrado" renderSubComponent={renderSubComponent} />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Produto' : 'Novo Produto'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <ProdutoFabricadoForm
            key={`produto-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
          />
        )}
      </Modal>

      <Modal isOpen={riModalOpen} onClose={() => { setRiModalOpen(false); setRiEditing(null); setRiProdutoId(null); }} title={riEditing ? 'Editar Ingrediente' : 'Novo Ingrediente'}>
        <ReceitaIngredienteForm
          key={`ri-form-${riEditing?.id ?? riEditing?.codigo ?? 'new'}`}
          onSubmit={handleRiSubmit}
          onCancel={() => { setRiModalOpen(false); setRiEditing(null); setRiProdutoId(null); }}
          initial={riEditing}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={confirmDeleteRi !== null}
        onClose={() => setConfirmDeleteRi(null)}
        onConfirm={handleDeleteRi}
        title="Excluir Ingrediente"
        message="Tem certeza que deseja excluir este ingrediente? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deletingRi}
      />
    </Layout>
  );
}