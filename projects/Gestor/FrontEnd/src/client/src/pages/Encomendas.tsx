import { useMemo, useState, useCallback, useEffect, Fragment } from 'react';
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
import type { Encomenda, EncomendaItem, ProdutoFabricado, ProdutoVenda, Cliente, VendaProduto, FormaPagamento } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, ListChecks, FileText } from 'lucide-react';
import { RowActions } from '@/components/ui/RowActions';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDecimals, parseItemCustomizacao } from '@/lib/utils';
import { getEncomendasRefreshSegundos } from '@/lib/settings';
import api from '@/lib/api';
import type { JSX } from 'react';

const columnHelper = createColumnHelper<Encomenda>();

const ETAPAS_ENCOMENDA: Record<number, { label: string; badge: string; descricao: string }> = {
  0: { label: 'Aguardando', badge: 'bg-yellow-100 text-yellow-800', descricao: 'Encomenda aguardando o início da produção' },
  1: { label: 'Em produção', badge: 'bg-blue-100 text-blue-800', descricao: 'Encomenda em produção' },
  2: { label: 'Finalizado', badge: 'bg-green-100 text-green-800', descricao: 'Produção finalizada - gera a venda do pedido' },
  3: { label: 'Saiu p/ Entrega', badge: 'bg-purple-100 text-purple-800', descricao: 'Encomenda saiu para entrega ao cliente' },
  4: { label: 'Entregue', badge: 'bg-emerald-100 text-emerald-800', descricao: 'Encomenda entregue ao cliente' },
  5: { label: 'Cancelada', badge: 'bg-red-100 text-red-800', descricao: 'Encomenda cancelada' },
};

function etapasPermitidas(status: number): number[] {
  switch (status) {
    case 0: return [1, 5];
    case 1: return [2, 5];
    case 2: return [3];
    case 3: return [4, 5];
    default: return [];
  }
}

function descricaoPersonalizacao(item: EncomendaItem): string {
  const partes: string[] = [];
  const rems = Array.isArray(item.removidos) ? item.removidos : [];
  const nomesRem = (rems as unknown[])
    .map((r) => (typeof r === 'string' ? r : String((r as { nome?: unknown })?.nome ?? '')))
    .filter(Boolean);
  if (nomesRem.length > 0) partes.push(`Sem: ${nomesRem.join(', ')}`);
  const adds = Array.isArray(item.adicionais) ? item.adicionais : [];
  if (adds.length > 0) {
    partes.push(
      `+ ${adds
        .map((a) => `${a.nome}${Number(a.quantidade) > 1 ? ` x${Number(a.quantidade)}` : ''}`)
        .join(', ')}`,
    );
  }
  return partes.join(' • ');
}

export function Encomendas() {
  const { data: encomendas, loading, error, create, update, remove, refetch } = useApi<Encomenda>('/encomendas');
  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
  const [filtroStatus, setFiltroStatus] = useState<string[]>(['0', '1', '2', '3']);

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
  const { data: produtosVenda } = useApi<ProdutoVenda>('/produtos-venda');
  const { data: clientes } = useApi<Cliente>('/clientes');
  const { data: formasPagamento } = useApi<FormaPagamento>('/formas-pagamento');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Encomenda | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loadedItens, setLoadedItens] = useState<Record<number, EncomendaItem[]>>({});
  const [loadedEnderecos, setLoadedEnderecos] = useState<Record<number, { endereco?: string; nr?: string; complemento?: string; bairro?: string; cidade?: string; uf?: string; retira_estabelecimento?: number; latitude?: number; longitude?: number; place_id?: string }>>({});

  const [etapa, setEtapa] = useState<{ id: number; cliente?: string; status: number } | null>(null);
  const [etapaAlvo, setEtapaAlvo] = useState<number | null>(null);
  const [etapaDataVenda, setEtapaDataVenda] = useState('');
  const [etapaRecebido, setEtapaRecebido] = useState(true);
  const [salvandoEtapa, setSalvandoEtapa] = useState(false);
  const [cupomVenda, setCupomVenda] = useState<VendaProduto | null>(null);

  const [refreshSeg, setRefreshSeg] = useState<number>(() => getEncomendasRefreshSegundos());

  useEffect(() => {
    const onSaved = () => setRefreshSeg(getEncomendasRefreshSegundos());
    window.addEventListener('settings:saved', onSaved);
    return () => window.removeEventListener('settings:saved', onSaved);
  }, []);

  useEffect(() => {
    if (!refreshSeg || refreshSeg <= 0) return;
    const id = setInterval(() => {
      void refetch();
    }, refreshSeg * 1000);
    return () => clearInterval(id);
  }, [refreshSeg, refetch]);

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
        produto_venda_id: row.produto_venda_id,
        produto_venda_nome: row.produto_venda_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
        ...parseItemCustomizacao(row),
      }));
      setLoadedItens((prev) => ({ ...prev, [encomendaId]: itens }));
      if (rows.length > 0) {
        const first = rows[0];
        if (first.eee_endereco || first.eee_cep || first.eee_retira_estabelecimento) {
          setLoadedEnderecos((prev) => ({
            ...prev,
            [encomendaId]: {
              endereco: first.eee_endereco,
              nr: first.eee_nr,
              complemento: first.eee_complemento,
              bairro: first.eee_bairro,
              cidade: first.eee_cidade,
              uf: first.eee_uf,
              retira_estabelecimento: first.eee_retira_estabelecimento,
              latitude: first.eee_latitude != null ? Number(first.eee_latitude) : undefined,
              longitude: first.eee_longitude != null ? Number(first.eee_longitude) : undefined,
              place_id: first.eee_place_id,
            },
          }));
        }
      }
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
        produto_venda_id: row.produto_venda_id,
        produto_venda_nome: row.produto_venda_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
        ...parseItemCustomizacao(row),
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
        forma_pagamento_id: first.forma_pagamento_id,
        forma_pagamento_nome: first.forma_pagamento_nome,
        forma_pagamento_classificacao: first.forma_pagamento_classificacao,
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
        produto_venda_id: row.produto_venda_id,
        produto_venda_nome: row.produto_venda_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
        ...parseItemCustomizacao(row),
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
    const endereco = loadedEnderecos[id];
    const fpId = row.forma_pagamento_id;
    const fp = fpId ? formasPagamento.find((f) => (f.id ?? f.codigo) === fpId) : null;
    const classificacao = (row.forma_pagamento_classificacao ?? fp?.classificacao ?? '').toUpperCase();
    const isCartao = classificacao === 'CARTAO_CREDITO' || classificacao === 'CARTAO_DEBITO';
    return (
      <div>
        {isCartao && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800">
            <span className="text-lg">💳</span>
            <span className="font-semibold">Levar máquina de cartão ao cliente</span>
          </div>
        )}
        {endereco && (
          <div className="mb-2 rounded-lg border border-purple-200 bg-purple-50/50 px-3 py-2 text-sm text-purple-900">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-xs uppercase tracking-wide text-purple-700">📍 Endereço de Entrega</div>
              {endereco.retira_estabelecimento !== 1 && (endereco.place_id || (endereco.latitude && endereco.longitude)) && (
                <a
                  href={
                    endereco.place_id
                      ? `https://www.google.com/maps/place/?q=place_id:${endereco.place_id}`
                      : `https://www.google.com/maps?q=${endereco.latitude},${endereco.longitude}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-purple-300 px-2 py-0.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  title="Abrir no Google Maps"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Maps
                </a>
              )}
            </div>
            {endereco.retira_estabelecimento === 1 ? (
              <span className="font-semibold">🏪 Retirar no estabelecimento</span>
            ) : (
              <span>
                {endereco.endereco}{endereco.nr ? `, ${endereco.nr}` : ''}
                {endereco.complemento ? ` - ${endereco.complemento}` : ''}
                {endereco.bairro ? ` - ${endereco.bairro}` : ''}
                {endereco.cidade ? ` - ${endereco.cidade}` : ''}
                {endereco.uf ? `/${endereco.uf}` : ''}
              </span>
            )}
          </div>
        )}
        {!itens ? (
          <span className="text-text-tertiary text-sm">Carregando...</span>
        ) : itens.length === 0 ? (
          <span className="text-text-tertiary text-sm">Nenhum item</span>
        ) : (
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
                const personalizacao = descricaoPersonalizacao(item);
                return (
                  <Fragment key={i}>
                    <tr className="border-t border-border-primary/50">
                      <td className="px-2 py-1.5">{produto?.nome ?? item.produto_venda_nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id ?? item.produto_venda_id}`}</td>
                      <td className="text-right px-2 py-1.5">{item.quantidade.toFixed(2).replace('.', ',')}</td>
                      <td className="text-right px-2 py-1.5">{formatDecimals(item.valor_unitario, 4)}</td>
                      <td className="text-right px-2 py-1.5 font-medium">{formatCurrency(item.valor_total)}</td>
                    </tr>
                    {personalizacao && (
                      <tr>
                        <td colSpan={4} className="px-2 pb-1.5 pt-0 text-xs">
                          <span className="text-text-secondary">
                            <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[10px] font-semibold uppercase tracking-wide">Personalizado</span>
                            {personalizacao}
                          </span>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }, [loadedItens, loadedEnderecos, produtos, formasPagamento]);

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
    columnHelper.accessor('forma_pagamento_nome', {
      header: 'Pagamento',
      cell: (info) => {
        const nome = info.getValue();
        if (!nome) return '-';
        const row = info.row.original;
        const fpId = row.forma_pagamento_id;
        const fp = fpId ? formasPagamento.find((f) => (f.id ?? f.codigo) === fpId) : null;
        const classificacao = (row.forma_pagamento_classificacao ?? fp?.classificacao ?? '').toUpperCase();
        const isCartao = classificacao === 'CARTAO_CREDITO' || classificacao === 'CARTAO_DEBITO';
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isCartao ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
            {isCartao && '💳 '}{nome}
          </span>
        );
      },
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
      setLoadedEnderecos({});
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
      setLoadedEnderecos({});
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
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
            title={refreshSeg > 0 ? `Atualizar (automático a cada ${refreshSeg}s)` : 'Atualizar manualmente'}
          >
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
            padrao: ['0', '1', '2', '3'],
            opcoes: [
              { valor: '0', label: 'Aguardando' },
              { valor: '1', label: 'Em produção' },
              { valor: '2', label: 'Finalizado' },
              { valor: '3', label: 'Saiu p/ Entrega' },
              { valor: '4', label: 'Entregue' },
              { valor: '5', label: 'Cancelada' },
            ],
            onChange: setFiltroStatus,
          }}
          onLimpar={() => {
            setPeriodo({ inicio: '', fim: '' });
            setFiltroStatus(['0', '1', '2', '3']);
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
            produtosVenda={produtosVenda}
            clientes={clientes}
            formasPagamento={formasPagamento}
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