import { useMemo, useState, useEffect, useCallback } from 'react';
import { PaginaFiltros } from '@/components/ui/PaginaFiltros';
import { passaBusca, passaStatusAtivo } from '@/lib/filtros';
import type { FiltroStatusAtivo } from '@/lib/filtros';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { FormaPagamentoForm } from '@/components/forms/FormaPagamentoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { FormaPagamento, CondicaoPagamento, FormaPagamentoCondicao } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, RefreshCw, Link } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import api from '@/lib/api';

const columnHelper = createColumnHelper<FormaPagamento>();

export function FormasPagamento() {
  const { data: formas, loading, error, create, update, remove, fetchOne, refetch } = useApi<FormaPagamento>('/formas-pagamento');
  const { data: condicoes } = useApi<CondicaoPagamento>('/condicoes-pagamento');
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatusAtivo>('1');

  const filtradas = useMemo(
    () =>
      (formas ?? []).filter(
        (item) => passaStatusAtivo(item.status === 1, filtroAtivo) && passaBusca([item.descricao], busca),
      ),
    [formas, filtroAtivo, busca],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FormaPagamento | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { addToast } = useToast();

  // Condicoes state
  const [expandedFormaId, setExpandedFormaId] = useState<number | null>(null);
  const [condicoesDaForma, setCondicoesDaForma] = useState<FormaPagamentoCondicao[]>([]);
  const [loadingCondicoes, setLoadingCondicoes] = useState(false);
  const [condicaoModalOpen, setCondicaoModalOpen] = useState(false);
  const [condicoesAssociadas, setCondicoesAssociadas] = useState<number[]>([]);

  const carregarCondicoes = useCallback(async (formaId: number) => {
    setLoadingCondicoes(true);
    try {
      const res = await api.get('/formas-pagamento-condicoes', { params: { forma_pagamento_id: formaId } });
      const data = Array.isArray(res.data) ? res.data : [];
      setCondicoesDaForma(data);
      setCondicoesAssociadas(data.map((c: FormaPagamentoCondicao) => c.condicao_pagamento_id));
    } catch {
      setCondicoesDaForma([]);
      setCondicoesAssociadas([]);
    } finally {
      setLoadingCondicoes(false);
    }
  }, []);

  const handleExpand = useCallback((row: FormaPagamento) => {
    const id = row.id ?? row.codigo;
    if (!id) return;
    setExpandedFormaId(id);
    carregarCondicoes(id);
  }, [carregarCondicoes]);

  const openCondicaoModal = () => {
    setCondicaoModalOpen(true);
  };

  const toggleCondicao = (condId: number) => {
    setCondicoesAssociadas((prev) =>
      prev.includes(condId) ? prev.filter((c) => c !== condId) : [...prev, condId],
    );
  };

  const salvarCondicoes = async () => {
    if (expandedFormaId === null) return;
    try {
      await api.post('/formas-pagamento-condicoes', {
        forma_pagamento_id: expandedFormaId,
        condicao_pagamento_ids: condicoesAssociadas,
      });
      setCondicaoModalOpen(false);
      await carregarCondicoes(expandedFormaId);
      addToast('success', 'Condicoes atualizadas com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar condicoes';
      addToast('error', msg);
    }
  };

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Codigo',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('descricao', { header: 'Descricao', enableSorting: true }),
    columnHelper.accessor('classificacao', { header: 'Classificacao' }),
    columnHelper.accessor('status', {
      header: 'Ativo',
      cell: (info) => info.getValue() === 1 ? <span className="text-accent-green">Sim</span> : <span className="text-accent-red">Nao</span>,
    }),
    columnHelper.display({
      id: 'expand',
      header: '',
      size: 40,
      meta: { expand: true } as Record<string, unknown>,
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
            rota="/formas-pagamento"
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

  const handleEdit = async (item: FormaPagamento) => {
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

  const handleSubmit = async (formData: FormaPagamento) => {
    try {
      if (editing) {
        await update({ ...formData, id: editing.id ?? editing.codigo });
        closeModal();
        addToast('success', 'Forma de pagamento atualizada com sucesso');
      } else {
        await create(formData);
        setFormKey((k) => k + 1);
        refetch();
        addToast('success', 'Forma de pagamento cadastrada com sucesso');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar forma de pagamento';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Forma de pagamento excluida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir forma de pagamento';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const renderSubComponent = (row: FormaPagamento) => {
    const formaId = row.id ?? row.codigo;
    if (expandedFormaId !== formaId) return <div />;

    const condicoesList = (condicoes ?? []).filter((c) => c.status === 1);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">
            Condicoes de Pagamento Associadas
          </span>
          <ShowForPermission rota="/formas-pagamento" acao={ACAO.EDITAR}>
            <button
              onClick={openCondicaoModal}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent-blue/10 text-accent-blue rounded-lg hover:bg-accent-blue/20 transition-colors"
            >
              <Link size={14} /> Gerenciar Condicoes
            </button>
          </ShowForPermission>
        </div>
        {loadingCondicoes ? (
          <Spinner />
        ) : condicoesDaForma.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhuma condicao associada</p>
        ) : (
          <div className="flex flex-wrap gap-2">
              {condicoesDaForma.map((fpc) => (
                <span
                  key={fpc.condicao_pagamento_id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-background-primary border border-border-primary rounded-full text-sm"
                >
                  {fpc.condicao_pagamento_descricao}
                  {fpc.a_vista === 1 ? (
                    <span className="text-accent-green text-xs font-medium">(A Vista)</span>
                  ) : (
                    <span className="text-text-muted text-xs">
                      ({fpc.qtd_parcelas}x)
                    </span>
                  )}
                </span>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <PageHeader title="Formas de Pagamento" subtitle="Cadastro de formas de pagamento">
        <ShowForPermission rota="/formas-pagamento" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Forma
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
              { valor: '1', label: 'Ativas' },
              { valor: '0', label: 'Inativas' },
              { valor: 'todos', label: 'Todas' },
            ],
            onChange: (v) => setFiltroAtivo(v as FiltroStatusAtivo),
          }}
          onLimpar={() => {
            setBusca('');
            setFiltroAtivo('1');
          }}
        />
        <DataTable
          columns={columns}
          data={filtradas}
          loading={loading}
          error={error}
          emptyMessage="Nenhuma forma de pagamento cadastrada"
          renderSubComponent={renderSubComponent}
          onExpand={handleExpand}
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <FormaPagamentoForm
            key={`forma-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            initial={editing}
          />
        )}
      </Modal>

      {/* Modal para gerenciar condicoes associadas */}
      <Modal
        isOpen={condicaoModalOpen}
        onClose={() => setCondicaoModalOpen(false)}
        title="Gerenciar Condicoes de Pagamento"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Selecione as condicoes de pagamento que deseja associar a esta forma:
          </p>
          <div className="max-h-80 overflow-y-auto space-y-2 border border-border-primary rounded-lg p-3">
            {(condicoes ?? []).filter((c) => c.status === 1).map((cond) => (
              <label
                key={cond.id ?? cond.codigo}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-hover cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={condicoesAssociadas.includes(cond.id ?? cond.codigo!)}
                  onChange={() => toggleCondicao(cond.id ?? cond.codigo!)}
                  className="rounded border-border-subtle"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">{cond.descricao}</span>
                  <span className="text-xs text-text-muted ml-2">
                    {cond.a_vista === 1
                      ? '(A Vista)'
                      : `(${cond.qtd_parcelas}x - ${cond.dias_primeiro_vencimento ?? 0} dias)`
                    }
                  </span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setCondicaoModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvarCondicoes}
              className="btn-primary"
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Forma de Pagamento"
        message="Tem certeza que deseja excluir esta forma de pagamento?"
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
