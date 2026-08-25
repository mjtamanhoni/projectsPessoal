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
import { AdicionalForm } from '@/components/forms/AdicionalForm';
import { AdicionalClassificacaoForm } from '@/components/forms/AdicionalClassificacaoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Adicional, AdicionalProdutoClassificacao, ProdutoClassificacao } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

const columnHelper = createColumnHelper<Adicional>();

export function Adicionais() {
  const { data: adicionais, loading, error, create, update, remove, fetchOne, refetch } = useApi<Adicional>('/adicionais');
  const { data: classificacoes } = useApi<ProdutoClassificacao>('/produto-classificacao');
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatusAtivo>('1');

  const adicionaisFiltrados = useMemo(
    () =>
      (adicionais ?? []).filter(
        (a) => passaStatusAtivo(a.ativo, filtroAtivo) && passaBusca([a.nome, a.descricao ?? ''], busca),
      ),
    [adicionais, filtroAtivo, busca],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Adicional | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const [links, setLinks] = useState<Record<number, AdicionalProdutoClassificacao[]>>({});
  const [loadingLinks, setLoadingLinks] = useState<Set<number>>(new Set());
  const [clModalOpen, setClModalOpen] = useState(false);
  const [clEditing, setClEditing] = useState<AdicionalProdutoClassificacao | null>(null);
  const [clProdutoId, setClProdutoId] = useState<number | null>(null);
  const [confirmDeleteCl, setConfirmDeleteCl] = useState<number | null>(null);
  const [deletingCl, setDeletingCl] = useState(false);

  const fetchLinks = useCallback(async (adicionalId: number) => {
    if (loadingLinks.has(adicionalId)) return;
    setLoadingLinks((prev) => new Set(prev).add(adicionalId));
    try {
      const res = await api.get<AdicionalProdutoClassificacao[]>('/adicionais-classificacoes', { params: { adicional_id: adicionalId } });
      setLinks((prev) => ({ ...prev, [adicionalId]: res.data ?? [] }));
    } catch {
      setLinks((prev) => ({ ...prev, [adicionalId]: [] }));
    } finally {
      setLoadingLinks((prev) => { const next = new Set(prev); next.delete(adicionalId); return next; });
    }
  }, [loadingLinks]);

  const renderSubComponent = (adicional: Adicional) => {
    const pid = adicional.id ?? adicional.codigo;
    if (!pid) return <></>;
    const list = links[pid] ?? [];
    const loading = loadingLinks.has(pid);

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Classificações do Adicional</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchLinks(pid)} className="p-1.5 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
              <RefreshCw size={14} className="text-text-secondary" />
            </button>
            <ShowForPermission rota="/adicionais" acao={ACAO.INCLUIR}>
              <button onClick={() => { setClEditing(null); setClProdutoId(pid); setClModalOpen(true); }} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
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
          <p className="text-sm text-text-muted text-center py-4">Nenhuma classificação vinculada</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-right text-xs font-medium text-text-muted py-2 px-2 w-12">Cód</th>
                <th className="text-left text-xs font-medium text-text-muted py-2 px-2">Classificação</th>
                <th className="text-center text-xs font-medium text-text-muted py-2 px-2 w-14">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((link) => {
                const linkId = link.produto_classificacao_id;
                return (
                  <tr key={linkId} className="border-b border-border-subtle/50 hover:bg-bg-muted/30 transition-colors">
                    <td className="text-text-secondary py-1.5 px-2 text-right text-xs">{linkId}</td>
                    <td className="text-text-primary py-1.5 px-2">{link.produto_classificacao_nome ?? `Classificação ${linkId}`}</td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <ShowForPermission rota="/adicionais" acao={ACAO.EDITAR}>
                          <button onClick={() => { setClEditing(link); setClProdutoId(pid); setClModalOpen(true); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
                            <Edit2 size={12} className="text-text-secondary" />
                          </button>
                        </ShowForPermission>
                        <ShowForPermission rota="/adicionais" acao={ACAO.EXCLUIR}>
                          <button onClick={() => { setConfirmDeleteCl(linkId); setClProdutoId(pid); }} className="p-0.5 rounded hover:bg-bg-muted transition-colors">
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
    }),
    columnHelper.accessor('nome', {
      header: 'Nome',
      enableSorting: true,
    }),
    columnHelper.accessor('descricao', {
      header: 'Descrição',
      enableSorting: true,
    }),
    columnHelper.accessor('preco', {
      header: 'Preço',
      enableSorting: true,
      cell: (info) => formatCurrency(info.getValue() ?? 0),
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
            rota="/adicionais"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (adicional: Adicional) => {
    const idToFetch = adicional.id || adicional.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? adicional);
    } catch {
      setEditing(adicional);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: Adicional) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Adicional atualizado com sucesso' : 'Adicional cadastrado com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar adicional';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      setLinks((prev) => { const next = { ...prev }; delete next[confirmDelete]; return next; });
      addToast('success', 'Adicional excluído com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir adicional';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleClSubmit = async (classificacaoId: number) => {
    const pid = clProdutoId;
    try {
      if (clEditing) {
        await api.delete('/adicionais-classificacoes', {
          params: { adicional_id: pid, produto_classificacao_id: clEditing.produto_classificacao_id },
        });
      }
      await api.post('/adicionais-classificacoes', { adicional_id: pid, produto_classificacao_id: classificacaoId });
      setClModalOpen(false);
      setClEditing(null);
      setClProdutoId(null);
      if (pid) await fetchLinks(pid);
      addToast('success', clEditing ? 'Classificação atualizada com sucesso' : 'Classificação adicionada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar classificação';
      addToast('error', msg);
    }
  };

  const handleDeleteCl = async () => {
    if (confirmDeleteCl === null) return;
    const pid = clProdutoId;
    setDeletingCl(true);
    try {
      await api.delete('/adicionais-classificacoes', {
        params: { adicional_id: pid, produto_classificacao_id: confirmDeleteCl },
      });
      setConfirmDeleteCl(null);
      if (pid) await fetchLinks(pid);
      addToast('success', 'Classificação removida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover classificação';
      addToast('error', msg);
    } finally {
      setDeletingCl(false);
    }
  };

  return (
    <Layout>
      <PageHeader title="Adicionais" subtitle="Gerencie adicionais para personalização de produtos">
        <ShowForPermission rota="/adicionais" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Adicional
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
        <DataTable columns={columns} data={adicionaisFiltrados} loading={loading} error={error} emptyMessage="Nenhum adicional cadastrado" renderSubComponent={renderSubComponent} />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Adicional' : 'Novo Adicional'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <AdicionalForm
            key={`adicional-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
          />
        )}
      </Modal>

      <Modal isOpen={clModalOpen} onClose={() => { setClModalOpen(false); setClEditing(null); setClProdutoId(null); }} title={clEditing ? 'Editar Classificação' : 'Adicionar Classificação'}>
        <AdicionalClassificacaoForm
          key={`cl-form-${clProdutoId ?? 'new'}-${clEditing?.produto_classificacao_id ?? 'new'}`}
          onSubmit={handleClSubmit}
          onCancel={() => { setClModalOpen(false); setClEditing(null); setClProdutoId(null); }}
          classificacoes={classificacoes ?? []}
          linksExistentes={clProdutoId !== null ? links[clProdutoId] ?? [] : []}
          initial={clEditing}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Adicional"
        message="Tem certeza que deseja excluir este adicional? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={confirmDeleteCl !== null}
        onClose={() => setConfirmDeleteCl(null)}
        onConfirm={handleDeleteCl}
        title="Remover Classificação"
        message="Tem certeza que deseja remover esta classificação deste adicional?"
        variant="danger"
        confirmLabel="Remover"
        loading={deletingCl}
      />
    </Layout>
  );
}