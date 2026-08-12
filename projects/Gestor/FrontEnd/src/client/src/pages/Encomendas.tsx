import { useMemo, useState, useCallback } from 'react';
import { PaginaFiltros } from '@/components/ui/PaginaFiltros';
import { mesCorrente, passaPeriodo } from '@/lib/filtros';
import type { FiltroPeriodo } from '@/lib/filtros';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { EncomendaForm } from '@/components/forms/EncomendaForm';
import { CupomVendaModal } from '@/components/cupom/CupomVendaModal';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Encomenda, EncomendaItem, ProdutoFabricado, Cliente, VendaProduto } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, ListChecks, FileText } from 'lucide-react';
import { RowActions } from '@/components/ui/RowActions';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDecimals } from '@/lib/utils';
import api from '@/lib/api';
import type { JSX } from 'react';

const columnHelper = createColumnHelper<Encomenda>();

const ETAPAS_ENCOMENDA: Record<number, { label: string; badge: string; descricao: string }> = {
  0: { label: 'Aguardando', badge: 'bg-yellow-100 text-yellow-800', descricao: 'Encomenda aguardando o início da produção' },
  1: { label: 'Em produção', badge: 'bg-blue-100 text-blue-800', descricao: 'Encomenda em produção' },
  2: { label: 'Finalizado', badge: 'bg-green-100 text-green-800', descricao: 'Produção finalizada - gera a venda do pedido' },
  3: { label: 'Entregue', badge: 'bg-emerald-100 text-emerald-800', descricao: 'Encomenda entregue ao cliente' },
  4: { label: 'Cancelada', badge: 'bg-red-100 text-red-800', descricao: 'Encomenda cancelada' },
};

function etapasPermitidas(status: number): number[] {
  switch (status) {
    case 0: return [1, 4];
    case 1: return [2, 4];
    case 2: return [3];
    default: return [];
  }
}

export function Encomendas() {
  const { data: encomendas, loading, error, create, update, remove, refetch } = useApi<Encomenda>('/encomendas');
  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
  const [filtroStatus, setFiltroStatus] = useState<string[]>(['0', '1']);

  const encomendasFiltradas = useMemo(
    () =>
      (encomendas ?? []).filter(
        (e) =>
          passaPeriodo(e.data_encomenda, periodo) &&
          (filtroStatus.length === 0 || filtroStatus.includes(String(e.status ?? 0))),
      ),
    [encomendas, periodo, filtroStatus],
  );
  const { data: produtos } = useApi<ProdutoFabricado>('/produtos-fabricados');
  const { data: clientes } = useApi<Cliente>('/clientes');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Encomenda | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loadedItens, setLoadedItens] = useState<Record<number, EncomendaItem[]>>({});

  const [etapa, setEtapa] = useState<{ id: number; cliente?: string; status: number } | null>(null);
  const [etapaAlvo, setEtapaAlvo] = useState<number | null>(null);
  const [etapaDataVenda, setEtapaDataVenda] = useState('');
  const [etapaRecebido, setEtapaRecebido] = useState(true);
  const [salvandoEtapa, setSalvandoEtapa] = useState(false);
  const [cupomVenda, setCupomVenda] = useState<VendaProduto | null>(null);

  const { addToast } = useToast();

  const formatDataEncomenda = (d?: string): string => {
    if (!d) return '-';
    const date = new Date(`${d.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString('pt-BR');
  };

  const fetchItens = useCallback(async (encomendaId: number) => {
    try {
      const response = await api.get('/encomendas', { params: { id: encomendaId } });
      const rows = response.data as any[];
      const itens = rows.map((row: any) => ({
        item_id: row.item_id,
        produto_fabricado_id: row.produto_fabricado_id,
        produto_nome: row.produto_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
      }));
      setLoadedItens((prev) => ({ ...prev, [encomendaId]: itens }));
    } catch {
      setLoadedItens((prev) => ({ ...prev, [encomendaId]: [] }));
    }
  }, []);

  const fetchFullEncomenda = useCallback(async (encomendaId: number): Promise<Encomenda | null> => {
    try {
      const response = await api.get('/encomendas', { params: { id: encomendaId } });
      const rows = response.data as any[];
      if (!rows || rows.length === 0) return null;
      const first = rows[0];
      const itens = rows.map((row: any) => ({
        id: row.item_id,
        produto_fabricado_id: row.produto_fabricado_id,
        produto_nome: row.produto_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
      }));
      return {
        id: first.id,
        codigo: first.id,
        cliente_id: first.cliente_id,
        cliente_nome: first.cliente_nome,
        data_encomenda: first.data_encomenda,
        data_entrega: first.data_entrega,
        valor_total: Number(first.valor_total),
        observacao: first.observacao,
        status: first.status,
        baixado: first.baixado,
        venda_id: first.venda_id,
        itens,
      };
    } catch {
      return null;
    }
  }, []);

  const abrirCupomDaVenda = useCallback(async (vendaId: number | null | undefined) => {
    if (!vendaId) return;
    try {
      const response = await api.get('/vendas-produto', { params: { id: vendaId } });
      const rows = response.data as any[];
      if (!rows || rows.length === 0) return;
      const first = rows[0];
      const itens = rows.map((row: any) => ({
        item_id: row.item_id,
        produto_fabricado_id: row.produto_fabricado_id,
        produto_nome: row.produto_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
      }));
      setCupomVenda({
        id: first.id,
        codigo: first.id,
        cliente_id: first.cliente_id,
        cliente_nome: first.cliente_nome,
        data_venda: first.data_venda,
        valor_total: Number(first.valor_total),
        observacao: first.observacao,
        recebido: first.recebido,
        itens,
      });
    } catch {
      addToast('error', 'Erro ao carregar cupom da venda');
    }
  }, [addToast]);

  const renderSubComponent = useCallback((row: Encomenda): JSX.Element => {
    const id = row.id!;
    const itens = loadedItens[id];
    if (!itens) {
      return <span className="text-text-tertiary text-sm">Carregando...</span>;
    }
    if (itens.length === 0) {
      return <span className="text-text-tertiary text-sm">Nenhum item</span>;
    }
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-secondary text-xs uppercase tracking-wider">
            <th className="text-left px-2 py-1 font-medium">Produto</th>
            <th className="text-right px-2 py-1 font-medium">Qtd.</th>
            <th className="text-right px-2 py-1 font-medium">Valor Unit.</th>
            <th className="text-right px-2 py-1 font-medium">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, i) => {
            const produto = produtos.find((p) => (p.id ?? p.codigo) === item.produto_fabricado_id);
            return (
              <tr key={i} className="border-t border-border-primary/50">
                <td className="px-2 py-1.5">{produto?.nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id}`}</td>
                <td className="text-right px-2 py-1.5">{item.quantidade.toFixed(2).replace('.', ',')}</td>
                <td className="text-right px-2 py-1.5">{formatDecimals(item.valor_unitario, 4)}</td>
                <td className="text-right px-2 py-1.5 font-medium">{formatCurrency(item.valor_total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }, [loadedItens, produtos]);

  const columns = [
    columnHelper.display({
      id: 'expand',
      enableColumnFilter: false,
      enableSorting: false,
      meta: { expand: true } as Record<string, unknown>,
      size: 40,
    }),
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: '#',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('cliente_nome', {
      header: 'Cliente',
      enableSorting: true,
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('data_encomenda', {
      header: 'Data Encomenda',
      cell: (info) => formatDataEncomenda(info.getValue()),
    }),
    columnHelper.accessor('data_entrega', {
      header: 'Data Entrega',
      cell: (info) => formatDataEncomenda(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Situação',
      cell: (info) => {
        const etapaInfo = ETAPAS_ENCOMENDA[Number(info.getValue())] ?? ETAPAS_ENCOMENDA[0];
        return <span className={`status-badge ${etapaInfo.badge}`}>{etapaInfo.label}</span>;
      },
    }),
    columnHelper.accessor('qtd_itens', {
      header: 'Qtd. Itens',
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('valor_total', {
      header: 'Valor Total',
      cell: (info) => formatCurrency(Number(info.getValue())),
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('observacao', {
      header: 'Observação',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => {
        const id = row.original.id ?? row.original.codigo;
        const status = Number(row.original.status ?? 0);
        if (!id) {
          return null;
        }
        const podeEditar = status < 2;
        const podeEtapa = etapasPermitidas(status).length > 0;
        const podeCupom = !!row.original.venda_id;
        const extras = [];
        if (podeCupom) {
          extras.push({
            rotulo: 'Cupom',
            icone: FileText,
            onClick: () => abrirCupomDaVenda(row.original.venda_id),
          });
        }
        if (podeEtapa) {
          extras.push({
            rotulo: 'Alterar Etapa',
            icone: ListChecks,
            cor: '#2D5E3A',
            onClick: () => { setEtapa({ id, cliente: row.original.cliente_nome, status }); setEtapaAlvo(null); setEtapaDataVenda(new Date().toISOString().slice(0, 10)); setEtapaRecebido(true); },
            permissaoRota: '/encomendas',
            permissaoAcao: ACAO.BAIXAR,
          });
        }
        return (
          <div className="flex justify-end">
            <RowActions
              rota="/encomendas"
              onEdit={podeEditar ? () => handleEdit(row.original) : undefined}
              onDelete={podeEditar ? () => setConfirmDelete(id) : undefined}
              extras={extras}
            />
          </div>
        );
      },
    }),
  ];

  const handleEdit = async (encomenda: Encomenda) => {
    const idToFetch = encomenda.id || encomenda.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    setFormKey((k) => k + 1);
    try {
      const full = await fetchFullEncomenda(idToFetch);
      setEditing(full ?? encomenda);
    } catch {
      setEditing(encomenda);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: Encomenda) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      setLoadedItens({});
      addToast('success', editing ? 'Encomenda atualizada com sucesso' : 'Encomenda cadastrada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar encomenda';
      addToast('error', msg);
    }
  };

  const handleAlterarEtapa = async () => {
    if (!etapa || etapaAlvo === null) return;
    setSalvandoEtapa(true);
    try {
      const resp = (await api.post('/encomendas/status', {
        id: etapa.id,
        status: etapaAlvo,
        data_venda: etapaAlvo === 2 ? etapaDataVenda : undefined,
        recebido: etapaAlvo === 2 ? etapaRecebido : undefined,
      })) as { data?: { venda_id?: number } };
      setEtapa(null);
      setEtapaAlvo(null);
      setLoadedItens({});
      await refetch();
      addToast('success', `Encomenda movida para "${ETAPAS_ENCOMENDA[etapaAlvo].label}"`);
      if (etapaAlvo === 2) {
        abrirCupomDaVenda(resp?.data?.venda_id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar etapa';
      addToast('error', msg);
    } finally {
      setSalvandoEtapa(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Encomenda excluida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir encomenda';
      addToast('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  return (
    <Layout>
      <PageHeader title="Encomendas" subtitle="Gerencie encomendas de produtos">
        <ShowForPermission rota="/encomendas" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Encomenda
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
          periodo={{
            inicio: periodo.inicio,
            fim: periodo.fim,
            onInicio: (v) => setPeriodo((p) => ({ ...p, inicio: v })),
            onFim: (v) => setPeriodo((p) => ({ ...p, fim: v })),
          }}
          multiStatus={{
            rotulo: 'Situação',
            valor: filtroStatus,
            padrao: ['0', '1'],
            opcoes: [
              { valor: '0', label: 'Aguardando' },
              { valor: '1', label: 'Em produção' },
              { valor: '2', label: 'Finalizado' },
              { valor: '3', label: 'Entregue' },
              { valor: '4', label: 'Cancelada' },
            ],
            onChange: setFiltroStatus,
          }}
          onLimpar={() => {
            setPeriodo({ inicio: '', fim: '' });
            setFiltroStatus(['0', '1']);
          }}
        />
        <DataTable
          columns={columns}
          data={encomendasFiltradas}
          loading={loading}
          error={error}
          emptyMessage="Nenhuma encomenda cadastrada"
          renderSubComponent={renderSubComponent}
          onExpand={(row) => { if (row.id) fetchItens(row.id); }}
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Encomenda' : 'Nova Encomenda'} maxWidth="max-w-2xl">
        {fetchingOne ? (
          <Spinner />
        ) : (
          <EncomendaForm
            key={`encomenda-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            produtos={produtos}
            clientes={clientes}
          />
        )}
      </Modal>

      <Modal isOpen={etapa !== null} onClose={() => setEtapa(null)} title="Alterar Etapa da Encomenda" maxWidth="max-w-lg">
        {etapa && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Etapa atual:{' '}
              <span className={`status-badge ${ETAPAS_ENCOMENDA[etapa.status]?.badge}`}>{ETAPAS_ENCOMENDA[etapa.status]?.label ?? 'Aguardando'}</span>
              {etapa.cliente ? ` Cliente: ${etapa.cliente}.` : ''}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {etapasPermitidas(etapa.status).map((alvo) => {
                const alvoInfo = ETAPAS_ENCOMENDA[alvo];
                const selecionado = etapaAlvo === alvo;
                return (
                  <button
                    key={alvo}
                    type="button"
                    onClick={() => setEtapaAlvo(alvo)}
                    className={`flex items-center gap-3 text-left px-4 py-3 rounded-lg border transition-all ${
                      selecionado ? 'border-accent-primary bg-accent-light' : 'border-border-primary hover:bg-bg-muted'
                    }`}
                  >
                    <span className={`status-badge ${alvoInfo.badge}`}>{alvoInfo.label}</span>
                    <span className="text-sm text-text-secondary">{alvoInfo.descricao}</span>
                  </button>
                );
              })}
            </div>
            {etapaAlvo === 2 && (
              <div className="space-y-4 rounded-lg border border-border-primary p-4">
                <p className="text-sm font-medium text-text-primary">Dados da venda que será gerada</p>
                <div className="space-y-1.5">
                  <label className="label-field">Data da Venda *</label>
                  <input type="date" className="input-field" value={etapaDataVenda} onChange={(e) => setEtapaDataVenda(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="etapa-recebido"
                    checked={etapaRecebido}
                    onChange={(e) => setEtapaRecebido(e.target.checked)}
                    className="rounded border-border-subtle"
                  />
                  <label htmlFor="etapa-recebido" className="text-sm text-text-secondary whitespace-nowrap">Venda já foi recebida?</label>
                </div>
              </div>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEtapa(null)} disabled={salvandoEtapa}>Cancelar</Button>
              <Button type="button" variant="primary" onClick={handleAlterarEtapa} disabled={salvandoEtapa || etapaAlvo === null || (etapaAlvo === 2 && !etapaDataVenda)}>
                {salvandoEtapa ? 'Salvando...' : 'Salvar Etapa'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CupomVendaModal venda={cupomVenda} onClose={() => setCupomVenda(null)} clientes={clientes} />

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Encomenda"
        message="Tem certeza que deseja excluir esta encomenda? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}