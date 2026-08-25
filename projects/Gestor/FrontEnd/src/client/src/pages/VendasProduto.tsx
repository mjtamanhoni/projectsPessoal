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
import { VendaProdutoForm } from '@/components/forms/VendaProdutoForm';
import { CupomVendaModal } from '@/components/cupom/CupomVendaModal';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { VendaProduto, VendaProdutoItem, ProdutoFabricado, ProdutoVenda, Cliente } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, RefreshCw, FileText, DollarSign, AlertTriangle } from 'lucide-react';
import { RowActions } from '@/components/ui/RowActions';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDate, formatDecimals, parseItemCustomizacao, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import api from '@/lib/api';
import type { JSX } from 'react';

const columnHelper = createColumnHelper<VendaProduto>();

interface RecebimentoReviewInfo {
  venda: VendaProduto;
  dataRecebimento: string;
  valorInformado: number;
  desconto: number;
  acrescimo: number;
  valorEfetivo: number;
  diferenca: number;
  tipo: 'maior' | 'menor';
}

export function VendasProduto() {
  const { data: vendas, loading, error, create, update, remove, refetch } = useApi<VendaProduto>('/vendas-produto');
  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
  const [filtroRecebido, setFiltroRecebido] = useState<string>('aberto');

  const vendasFiltradas = useMemo(
    () =>
      (vendas ?? []).filter(
        (v) =>
          passaPeriodo(v.data_venda, periodo) &&
          (filtroRecebido === 'todos' || (filtroRecebido === 'recebido' ? v.recebido === true : v.recebido !== true)),
      ),
    [vendas, periodo, filtroRecebido],
  );
  const { data: produtos } = useApi<ProdutoFabricado>('/produtos-fabricados');
  const { data: produtosVenda } = useApi<ProdutoVenda>('/produtos-venda');
  const { data: clientes } = useApi<Cliente>('/clientes');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendaProduto | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cupomVenda, setCupomVenda] = useState<VendaProduto | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [loadedItens, setLoadedItens] = useState<Record<number, VendaProdutoItem[]>>({});
  const [receberOpen, setReceberOpen] = useState(false);
  const [recebendo, setRecebendo] = useState<VendaProduto | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [reviewInfo, setReviewInfo] = useState<RecebimentoReviewInfo | null>(null);
  const { addToast } = useToast();

  const fetchItens = useCallback(async (vendaId: number) => {
    try {
      const response = await api.get('/vendas-produto', { params: { id: vendaId } });
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
      setLoadedItens((prev) => ({ ...prev, [vendaId]: itens }));
    } catch {
      setLoadedItens((prev) => ({ ...prev, [vendaId]: [] }));
    }
  }, []);

  const fetchFullVenda = useCallback(async (vendaId: number): Promise<VendaProduto | null> => {
    try {
      const response = await api.get('/vendas-produto', { params: { id: vendaId } });
      const rows = response.data as any[];
      if (!rows || rows.length === 0) return null;
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
      return {
        id: first.id,
        codigo: first.id,
        cliente_id: first.cliente_id,
        cliente_nome: first.cliente_nome,
        data_venda: first.data_venda,
        valor_total: Number(first.valor_total),
        observacao: first.observacao,
        recebido: first.recebido,
        itens,
      };
    } catch {
      return null;
    }
  }, []);

  const renderSubComponent = useCallback((row: VendaProduto): JSX.Element => {
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
                <td className="px-2 py-1.5">{produto?.nome ?? item.produto_venda_nome ?? item.produto_nome ?? `ID ${item.produto_fabricado_id ?? item.produto_venda_id}`}</td>
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

  const handlePrintCupom = async (venda: VendaProduto) => {
    const full = await fetchFullVenda(venda.id ?? venda.codigo ?? 0);
    setCupomVenda(full ?? venda);
  };

  const abrirRecebimento = (venda: VendaProduto) => {
    setRecebendo(venda);
    setReceberOpen(true);
  };

  const executarRecebimento = async (
    venda: VendaProduto,
    dataRecebimento: string,
    valorBaixa: number,
    desconto: number,
    acrescimo: number,
    valorRestante = 0,
  ) => {
    const id = venda.id ?? venda.codigo ?? 0;
    setReceiving(true);
    try {
      await api.put('/vendas-produto/receber', {
        id,
        data_recebimento: dataRecebimento,
        valor: valorBaixa,
        desconto,
        acrescimo,
      });
      if (valorRestante > 0) {
        try {
          let categoriaId: number | undefined;
          let descricaoBase = `Venda Produto #${id}`;
          const contasResp = await api.get('/contas-receber');
          const origem = (contasResp.data as Array<{ lancamentoOrigemId?: number; idCategoria?: number; descricao?: string }>)
            .filter((c) => Number(c.lancamentoOrigemId) === Number(id))[0];
          if (origem) {
            categoriaId = origem.idCategoria;
            descricaoBase = origem.descricao || descricaoBase;
          }
          await api.post('/contas-receber', {
            descricao: `${descricaoBase} (restante)`,
            valor: valorRestante,
            dataVencimento: new Date().toISOString().split('T')[0],
            clienteId: venda.cliente_id ?? null,
            ...(categoriaId ? { idCategoria: categoriaId } : {}),
            lancamentoOrigemId: id,
          });
        } catch {
          addToast('warning', 'Venda recebida, mas houve erro ao gerar o lançamento do restante');
        }
      }
      setReceberOpen(false);
      setRecebendo(null);
      setReviewInfo(null);
      refetch();
      addToast('success', 'Venda recebida com sucesso');
      const full = await fetchFullVenda(id);
      setCupomVenda(full ?? venda);
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao receber venda');
    } finally {
      setReceiving(false);
    }
  };

  const handleReceberSubmit = (dataRecebimento: string, valorStr: string, descontoStr: string, acrescimoStr: string) => {
    if (!recebendo) return;

    const valorOriginal = Number(recebendo.valor_total);
    const valorInformado = parseCurrencyInput(valorStr);
    const desconto = parseCurrencyInput(descontoStr || '0');
    const acrescimo = parseCurrencyInput(acrescimoStr || '0');
    const valorEfetivo = valorInformado + acrescimo - desconto;
    const diferenca = Math.abs(valorOriginal - valorEfetivo);

    if (Math.abs(valorEfetivo - valorOriginal) < 0.005) {
      executarRecebimento(recebendo, dataRecebimento, valorEfetivo, desconto, acrescimo);
    } else {
      setReviewInfo({
        venda: recebendo,
        dataRecebimento,
        valorInformado,
        desconto,
        acrescimo,
        valorEfetivo,
        diferenca,
        tipo: valorEfetivo > valorOriginal ? 'maior' : 'menor',
      });
    }
  };

  const handleReviewAcrescimo = () => {
    if (!reviewInfo) return;
    const { venda, dataRecebimento, valorInformado, desconto } = reviewInfo;
    const novoAcrescimo = reviewInfo.acrescimo + reviewInfo.diferenca;
    executarRecebimento(venda, dataRecebimento, valorInformado, desconto, novoAcrescimo);
  };

  const handleReviewDesconto = () => {
    if (!reviewInfo) return;
    const { venda, dataRecebimento, valorInformado, acrescimo } = reviewInfo;
    const novoDesconto = reviewInfo.desconto + reviewInfo.diferenca;
    executarRecebimento(venda, dataRecebimento, valorInformado, novoDesconto, acrescimo);
  };

  const handleReviewNewLancamento = () => {
    if (!reviewInfo) return;
    const { venda, dataRecebimento, valorInformado, desconto, acrescimo, diferenca } = reviewInfo;
    executarRecebimento(venda, dataRecebimento, valorInformado, desconto, acrescimo, diferenca);
  };

  const handleReviewCorrigir = () => {
    setReviewInfo(null);
  };

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
    columnHelper.accessor('data_venda', {
      header: 'Data',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('recebido', {
      header: 'Recebida',
      cell: (info) => info.getValue() ? <span className="text-accent-green font-medium">Sim</span> : <span className="text-accent-red">Não</span>,
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
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            rota="/vendas-produto"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
            extras={[
              ...(row.original.recebido
                ? []
                : [
                    {
                      rotulo: 'Receber',
                      icone: DollarSign,
                      cor: '#16a34a',
                      onClick: () => abrirRecebimento(row.original),
                      permissaoRota: '/contas-receber',
                      permissaoAcao: ACAO.BAIXAR,
                    },
                  ]),
              {
                rotulo: 'Cupom',
                icone: FileText,
                onClick: () => handlePrintCupom(row.original),
              },
            ]}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (venda: VendaProduto) => {
    const idToFetch = venda.id || venda.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    setFormKey((k) => k + 1);
    try {
      const full = await fetchFullVenda(idToFetch);
      setEditing(full ?? venda);
    } catch {
      setEditing(venda);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: VendaProduto) => {
    try {
      let vendaSalva: VendaProduto | null = null;
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        const resp = (await create(data)) as { codigo?: number; id?: number } | null | undefined;
        const novoId = resp?.codigo ?? resp?.id ?? data.id ?? data.codigo;
        vendaSalva = novoId
          ? { ...data, id: novoId, codigo: novoId }
          : data;
      }
      setModalOpen(false);
      setEditing(null);
      setLoadedItens({});
      addToast('success', editing ? 'Venda atualizada com sucesso' : 'Venda cadastrada com sucesso');
      if (vendaSalva) {
        const full = await fetchFullVenda(vendaSalva.id ?? vendaSalva.codigo ?? 0);
        setCupomVenda(full ?? vendaSalva);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar venda';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Venda excluida com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir venda';
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
      <PageHeader title="Vendas de Produtos" subtitle="Gerencie vendas de produtos">
        <ShowForPermission rota="/vendas-produto" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Venda
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
          status={{
            rotulo: 'Situação',
            valor: filtroRecebido,
            opcoes: [
              { valor: 'aberto', label: 'Abertas' },
              { valor: 'recebido', label: 'Recebidas' },
              { valor: 'todos', label: 'Todas' },
            ],
            onChange: setFiltroRecebido,
          }}
          onLimpar={() => {
            setPeriodo({ inicio: '', fim: '' });
            setFiltroRecebido('aberto');
          }}
        />
        <DataTable
          columns={columns}
          data={vendasFiltradas}
          loading={loading}
          error={error}
          emptyMessage="Nenhuma venda cadastrada"
          renderSubComponent={renderSubComponent}
          onExpand={(row) => { if (row.id) fetchItens(row.id); }}
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Venda' : 'Nova Venda'} maxWidth="max-w-2xl">
        {fetchingOne ? (
          <Spinner />
        ) : (
          <VendaProdutoForm
            key={`venda-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            produtos={produtos}
            produtosVenda={produtosVenda}
            clientes={clientes}
          />
        )}
      </Modal>

      <CupomVendaModal venda={cupomVenda} onClose={() => setCupomVenda(null)} clientes={clientes} />

      <Modal isOpen={receberOpen} onClose={() => { setReceberOpen(false); setRecebendo(null); }} title="Receber Venda">
        <ReceberVendaForm
          key={`receber-venda-${recebendo?.id ?? recebendo?.codigo ?? 'new'}`}
          venda={recebendo}
          onSubmit={handleReceberSubmit}
          onCancel={() => { setReceberOpen(false); setRecebendo(null); }}
          loading={receiving}
        />
      </Modal>

      <Modal isOpen={!!reviewInfo} onClose={() => setReviewInfo(null)} title={reviewInfo?.tipo === 'maior' ? 'Valor Maior que o Original' : 'Valor Menor que o Original'}>
        {reviewInfo && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${reviewInfo.tipo === 'maior' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <AlertTriangle size={24} className={`flex-shrink-0 ${reviewInfo.tipo === 'maior' ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Valor informado <strong>{formatCurrency(reviewInfo.valorEfetivo)}</strong> é {reviewInfo.tipo === 'maior' ? 'maior' : 'menor'} que o original <strong>{formatCurrency(Number(reviewInfo.venda.valor_total))}</strong>
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Diferença de <strong>{formatCurrency(reviewInfo.diferenca)}</strong>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {reviewInfo.tipo === 'maior' && (
                <Button onClick={handleReviewAcrescimo} variant="secondary" className="w-full justify-center">
                  Lançar Diferença como Acréscimo (R$ {formatCurrency(reviewInfo.acrescimo + reviewInfo.diferenca)})
                </Button>
              )}
              {reviewInfo.tipo === 'menor' && (
                <>
                  <Button onClick={handleReviewDesconto} variant="secondary" className="w-full justify-center">
                    Lançar Diferença como Desconto (R$ {formatCurrency(reviewInfo.desconto + reviewInfo.diferenca)})
                  </Button>
                  <Button onClick={handleReviewNewLancamento} variant="secondary" className="w-full justify-center">
                    Gerar Novo Lançamento (R$ {formatCurrency(reviewInfo.diferenca)})
                  </Button>
                </>
              )}
              <Button onClick={handleReviewCorrigir} variant="secondary" className="w-full justify-center">
                Corrigir Valor
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Venda"
        message="Tem certeza que deseja excluir esta venda? Esta acao nao pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}

function ReceberVendaForm({ venda, onSubmit, onCancel, loading }: {
  venda: VendaProduto | null;
  onSubmit: (dataRecebimento: string, valor: string, desconto: string, acrescimo: string) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [dataRecebimento, setDataRecebimento] = useState(() => new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState(() => (venda ? formatCurrencyInput(Number(venda.valor_total).toFixed(2)) : ''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!venda) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!dataRecebimento) newErrors.dataRecebimento = 'Data de recebimento é obrigatória';
    if (!valor || parseCurrencyInput(valor) <= 0) newErrors.valor = 'Valor deve ser maior que zero';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSubmit(dataRecebimento, valor, '0', '0');
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="label-field">Venda</label>
        <p className="text-sm font-medium">
          #{venda.id ?? venda.codigo} {venda.cliente_nome ? `- ${venda.cliente_nome}` : ''}
        </p>
        <p className="text-sm text-text-secondary">Valor Total: {formatCurrency(Number(venda.valor_total))}</p>
      </div>

      <div className="space-y-1.5">
        <label className="label-field">Data de Recebimento *</label>
        <input type="date" className="input-field" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
        {errors.dataRecebimento && <p className="text-sm text-accent-red">{errors.dataRecebimento}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="label-field">Valor Recebido *</label>
        <input
          type="text" inputMode="decimal" placeholder="0,00"
          className={`input-field ${errors.valor ? 'ring-2 ring-accent-red/30 border-accent-red' : ''}`}
          value={valor}
          onChange={(e) => { const f = formatCurrencyInput(e.target.value); setValor(f); }}
          onBlur={() => { if (valor && !valor.includes(',')) setValor(valor + ',00'); }}
        />
        {errors.valor && <p className="text-sm text-accent-red mt-1">{errors.valor}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Recebendo...' : 'Receber'}</Button>
      </div>
    </form>
  );
}