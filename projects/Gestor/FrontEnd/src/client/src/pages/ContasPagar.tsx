import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { ContaPagarForm } from '@/components/forms/ContaPagarForm';
import { formatCurrency, formatDate, isOverdue, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import type { ContaPagar, Fornecedor, Categoria } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, CheckCircle, RotateCcw, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

const columnHelper = createColumnHelper<ContaPagar>();

interface BaixaReviewInfo {
  id: number;
  original: ContaPagar;
  dataPagamento: string;
  valorInformado: number;
  desconto: number;
  acrescimo: number;
  valorEfetivo: number;
  diferenca: number;
  tipo: 'maior' | 'menor';
}

export function ContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContaPagar | null>(null);
  const [baixando, setBaixando] = useState<ContaPagar | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmEstorno, setConfirmEstorno] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewInfo, setReviewInfo] = useState<BaixaReviewInfo | null>(null);
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(primeiroDia);
  const [dataFim, setDataFim] = useState(ultimoDia);
  const [status, setStatus] = useState('ambos');
  const [showFilters, setShowFilters] = useState(true);

  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      params.status = status;
      const [c, f, ct] = await Promise.all([
        api.get('/contas-pagar', { params }),
        api.get('/fornecedores'),
        api.get('/categorias/pagar'),
      ]);
      setContas(c.data as ContaPagar[]);
      setFornecedores(f.data as Fornecedor[]);
      setCategorias(ct.data as Categoria[]);
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorData.response?.data?.error || errorData.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEdit = async (conta: ContaPagar) => {
    const idToFetch = conta.id || conta.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    try {
      const response = await api.get('/contas-pagar', { params: { id: idToFetch } });
      const fetchedContas = response.data as ContaPagar[];
      setEditing(fetchedContas && fetchedContas.length > 0 ? fetchedContas[0] : conta);
    } catch {
      setEditing(conta);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (contasArray: Record<string, unknown>[]) => {
    try {
      if (contasArray.length === 1 && editing) {
        await api.post('/contas-pagar', { ...contasArray[0], id: editing.id || editing.codigo });
      } else {
        for (const conta of contasArray) {
          await api.post('/contas-pagar', conta);
        }
      }
      setModalOpen(false);
      setEditing(null);
      fetchData();
      const msg = contasArray.length > 1
        ? `${contasArray.length} contas cadastradas com sucesso`
        : editing ? 'Conta atualizada com sucesso' : 'Conta cadastrada com sucesso';
      addToast('success', msg);
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setActionLoading(true);
    try {
      await api.delete('/contas-pagar', { params: { id: confirmDelete } });
      setConfirmDelete(null);
      fetchData();
      addToast('success', 'Conta excluída com sucesso');
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao excluir');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEstornar = async () => {
    if (confirmEstorno === null) return;
    setActionLoading(true);
    try {
      await api.put('/contas-pagar/estornar', { id: confirmEstorno });
      setConfirmEstorno(null);
      fetchData();
      addToast('success', 'Pagamento estornado com sucesso');
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao estornar');
    } finally {
      setActionLoading(false);
    }
  };

  const executarBaixa = async (id: number, dataPagamento: string, valorBaixa: number, desconto: number, acrescimo: number) => {
    setActionLoading(true);
    try {
      await api.put('/contas-pagar/pagar', { id, dataPagamento, valor: valorBaixa, desconto, acrescimo });
      setBaixaModalOpen(false);
      setBaixando(null);
      fetchData();
      addToast('success', 'Conta paga com sucesso');
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao pagar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBaixaSubmit = (dataPagamento: string, valorStr: string, descontoStr: string, acrescimoStr: string) => {
    if (!baixando) return;

    const valorOriginal = Number(baixando.valor);
    const valorInformado = parseCurrencyInput(valorStr);
    const desconto = parseCurrencyInput(descontoStr || '0');
    const acrescimo = parseCurrencyInput(acrescimoStr || '0');
    const valorEfetivo = valorInformado + acrescimo - desconto;
    const diferenca = Math.abs(valorOriginal - valorEfetivo);
    const id = baixando.id || baixando.codigo!;

    if (Math.abs(valorEfetivo - valorOriginal) < 0.005) {
      executarBaixa(id, dataPagamento, valorEfetivo, desconto, acrescimo);
    } else if (valorEfetivo > valorOriginal) {
      setReviewInfo({ id, original: { ...baixando }, dataPagamento, valorInformado, desconto, acrescimo, valorEfetivo, diferenca, tipo: 'maior' });
    } else {
      setReviewInfo({ id, original: { ...baixando }, dataPagamento, valorInformado, desconto, acrescimo, valorEfetivo, diferenca, tipo: 'menor' });
    }
  };

  const handleReviewAcrescimo = () => {
    if (!reviewInfo) return;
    const { id, dataPagamento, valorInformado, desconto } = reviewInfo;
    const novoAcrescimo = reviewInfo.acrescimo + reviewInfo.diferenca;
    setReviewInfo(null);
    executarBaixa(id, dataPagamento, valorInformado, desconto, novoAcrescimo);
  };

  const handleReviewDesconto = () => {
    if (!reviewInfo) return;
    const { id, dataPagamento, valorInformado, acrescimo } = reviewInfo;
    const novoDesconto = reviewInfo.desconto + reviewInfo.diferenca;
    setReviewInfo(null);
    executarBaixa(id, dataPagamento, valorInformado, novoDesconto, acrescimo);
  };

  const handleReviewNewLancamento = () => {
    if (!reviewInfo) return;
    const { id, dataPagamento, valorInformado, desconto, acrescimo, original } = reviewInfo;
    setReviewInfo(null);
    executarBaixa(id, dataPagamento, valorInformado, desconto, acrescimo);
    setEditing({
      descricao: original.descricao,
      valor: reviewInfo.diferenca,
      dataVencimento: new Date().toISOString().split('T')[0],
      fornecedorId: original.fornecedorId,
      idCategoria: original.idCategoria,
      lancamentoOrigemId: original.id || original.codigo,
    } as ContaPagar);
    setModalOpen(true);
  };

  const handleReviewCorrigir = () => {
    setReviewInfo(null);
  };

  const columns = [
    columnHelper.accessor('descricao', {
      header: 'Descrição',
    }),
    columnHelper.accessor('fornecedorNome', {
      header: 'Fornecedor',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('valor', {
      header: 'Valor',
      cell: (info) => <span className="font-mono">{formatCurrency(Number(info.getValue()))}</span>,
      sortingFn: 'alphanumeric',
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('dataVencimento', {
      header: 'Vencimento',
      cell: (info) => formatDate(info.getValue()),
      sortingFn: 'datetime',
    }),
    columnHelper.accessor((row) => (row.pago ? 'pago' : isOverdue(row.dataVencimento) ? 'atrasado' : 'pendente'), {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        row.original.pago ? <span className="status-badge pago">Pago</span>
        : isOverdue(row.original.dataVencimento) ? <span className="status-badge atrasado">Atrasado</span>
        : <span className="status-badge pendente">Pendente</span>
      ),
    }),
    columnHelper.display({
      id: 'valor_baixa',
      header: 'Valor Pago',
      cell: ({ row }) => (
        row.original.pago && row.original.valorBaixa ? <span className="font-mono text-sm">{formatCurrency(row.original.valorBaixa)}</span>
        : <span className="text-text-secondary text-sm">-</span>
      ),
      enableColumnFilter: false,
      enableSorting: false,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.pago ? (
            <ShowForPermission rota="/contas-pagar" acao={ACAO.ESTORNAR}>
              <button onClick={() => setConfirmEstorno(row.original.id || row.original.codigo!)} className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors" title="Estornar Pagamento">
                <RotateCcw size={16} className="text-orange-500" />
              </button>
            </ShowForPermission>
          ) : (
            <ShowForPermission rota="/contas-pagar" acao={ACAO.BAIXAR}>
              <button onClick={() => { setBaixando(row.original); setBaixaModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="Baixar Conta">
                <CheckCircle size={16} className="text-accent-primary" />
              </button>
            </ShowForPermission>
          )}
          {!row.original.pago && (
            <>
              <ShowForPermission rota="/contas-pagar" acao={ACAO.EDITAR}>
                <button onClick={() => handleEdit(row.original)} className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors ml-1">
                  <Edit2 size={16} className="text-text-secondary" />
                </button>
              </ShowForPermission>
              <ShowForPermission rota="/contas-pagar" acao={ACAO.EXCLUIR}>
                <button onClick={() => { setConfirmDelete(row.original.id || row.original.codigo!); }} className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors ml-1">
                  <Trash2 size={16} className="text-accent-red" />
                </button>
              </ShowForPermission>
            </>
          )}
        </div>
      ),
    }),
  ];

  return (
    <Layout>
      <PageHeader title="Contas a Pagar" subtitle="Gerencie suas contas a pagar">
        <ShowForPermission rota="/contas-pagar" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={18} /> Nova Conta</Button>
        </ShowForPermission>
      </PageHeader>

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 text-sm bg-background-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors">
          <Filter size={16} /> Filtros
        </button>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Data Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Data Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm">
                <option value="ambos">Ambos</option>
                <option value="aberto">Aberto</option>
                <option value="pago">Pago</option>
              </select>
            </div>
            <button onClick={() => { setDataInicio(primeiroDia); setDataFim(ultimoDia); setStatus('ambos'); }} className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors">Limpar</button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button onClick={() => fetchData()} className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors" title="Atualizar">
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable columns={columns} data={contas} loading={loading} error={error} emptyMessage="Nenhuma conta encontrada" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}>
        {fetchingOne ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
          </div>
        ) : (
          <ContaPagarForm
            key={`conta-pagar-form-${editing?.id || editing?.codigo || 'new'}-${Date.now()}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            fornecedores={fornecedores.map((f) => ({ id: f.id || f.codigo || 0, nome: f.nome }))}
            categorias={categorias.map((c) => ({ id: c.id || c.codigo || 0, nome: c.nome }))}
          />
        )}
      </Modal>

      <Modal isOpen={baixaModalOpen} onClose={() => { setBaixaModalOpen(false); setBaixando(null); }} title="Baixar Conta a Pagar">
        <BaixaPagarForm
          key={`baixa-pagar-${baixando?.id || baixando?.codigo || 'new'}`}
          conta={baixando}
          onSubmit={handleBaixaSubmit}
          onCancel={() => { setBaixaModalOpen(false); setBaixando(null); }}
        />
      </Modal>

      <ConfirmDialog isOpen={confirmDelete !== null} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Excluir Conta" message="Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita." variant="danger" confirmLabel="Excluir" loading={actionLoading} />
      <ConfirmDialog isOpen={confirmEstorno !== null} onClose={() => setConfirmEstorno(null)} onConfirm={handleEstornar} title="Estornar Pagamento" message="Tem certeza que deseja estornar o pagamento desta conta?" variant="warning" confirmLabel="Estornar" loading={actionLoading} />

      <Modal isOpen={!!reviewInfo} onClose={() => setReviewInfo(null)} title={reviewInfo?.tipo === 'maior' ? 'Valor Maior que o Original' : 'Valor Menor que o Original'}>
        {reviewInfo && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${reviewInfo.tipo === 'maior' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <AlertTriangle size={24} className={`flex-shrink-0 ${reviewInfo.tipo === 'maior' ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Valor informado <strong>{formatCurrency(reviewInfo.valorEfetivo)}</strong> é {reviewInfo.tipo === 'maior' ? 'maior' : 'menor'} que o original <strong>{formatCurrency(Number(reviewInfo.original.valor))}</strong>
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
    </Layout>
  );
}

function BaixaPagarForm({ conta, onSubmit, onCancel }: {
  conta: ContaPagar | null;
  onSubmit: (dataPagamento: string, valor: string, desconto: string, acrescimo: string) => void;
  onCancel: () => void;
}) {
  const [dataPagamento, setDataPagamento] = useState(() => new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState(() => conta ? formatCurrencyInput(Number(conta.valor).toFixed(2)) : '');
  const [desconto, setDesconto] = useState('');
  const [acrescimo, setAcrescimo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!conta) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!dataPagamento) newErrors.dataPagamento = 'Data de pagamento é obrigatória';
    if (!valor || parseCurrencyInput(valor) <= 0) newErrors.valor = 'Valor deve ser maior que zero';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSubmit(dataPagamento, valor, desconto, acrescimo);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="label-field">Conta</label>
        <p className="text-sm font-medium">{conta.descricao}</p>
        <p className="text-sm text-text-secondary">Valor Original: {formatCurrency(Number(conta.valor))}</p>
      </div>

      <div className="space-y-1.5">
        <label className="label-field">Data de Pagamento *</label>
        <input type="date" className="input-field" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
        {errors.dataPagamento && <p className="text-sm text-accent-red">{errors.dataPagamento}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="label-field">Valor Pago *</label>
        <input
          type="text" inputMode="decimal" placeholder="0,00"
          className={`input-field ${errors.valor ? 'ring-2 ring-accent-red/30 border-accent-red' : ''}`}
          value={valor}
          onChange={(e) => { const f = formatCurrencyInput(e.target.value); setValor(f); }}
          onBlur={() => { if (valor && !valor.includes(',')) setValor(valor + ',00'); }}
        />
        {errors.valor && <p className="text-sm text-accent-red mt-1">{errors.valor}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="label-field">Desconto</label>
        <input
          type="text" inputMode="decimal" placeholder="0,00"
          className="input-field"
          value={desconto}
          onChange={(e) => { const f = formatCurrencyInput(e.target.value); setDesconto(f); }}
          onBlur={() => { if (desconto && !desconto.includes(',')) setDesconto(desconto + ',00'); }}
        />
      </div>

      <div className="space-y-1.5">
        <label className="label-field">Acréscimo</label>
        <input
          type="text" inputMode="decimal" placeholder="0,00"
          className="input-field"
          value={acrescimo}
          onChange={(e) => { const f = formatCurrencyInput(e.target.value); setAcrescimo(f); }}
          onBlur={() => { if (acrescimo && !acrescimo.includes(',')) setAcrescimo(acrescimo + ',00'); }}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Pagar</Button>
      </div>
    </form>
  );
}