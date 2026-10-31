import { useState, useEffect, useCallback, useMemo } from 'react';
import type { JSX } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { TituloPagarForm, type TituloPagarFormData } from '@/components/forms/TituloPagarForm';
import { PagamentoTituloForm, type PagamentoTituloFormData } from '@/components/forms/PagamentoTituloForm';
import { formatCurrency, formatDate, isOverdue } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import type { TituloPagar, PagamentoEfetuado } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Menu, Trash2, CircleDollarSign, RefreshCw, FileText, Wallet } from 'lucide-react';
import { RowActions } from '@/components/ui/RowActions';
import { PageHeader } from '@/components/ui/PageHeader';

const columnHelper = createColumnHelper<TituloPagar>();

function statusDoTitulo(titulo: TituloPagar): { label: string; className: string } {
  if (titulo.status === 'QUITADO') return { label: 'Baixado', className: 'pago' };
  if (titulo.status === 'PARCIAL') return { label: 'Parcial', className: 'parcial' };
  if (titulo.status === 'CANCELADO') return { label: 'Cancelado', className: 'cancelado' };
  if (isOverdue(titulo.dataVencimento)) return { label: 'Atrasado', className: 'atrasado' };
  return { label: 'Pendente', className: 'pendente' };
}

export function TitulosPagar() {
  const [titulos, setTitulos] = useState<TituloPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TituloPagar | null>(null);
  const [saving, setSaving] = useState(false);

  const [pagamentoTitulo, setPagamentoTitulo] = useState<TituloPagar | null>(null);
  const [pagamentoSaving, setPagamentoSaving] = useState(false);
  const [pagamentoFormKey, setPagamentoFormKey] = useState(0);

  const [pagamentosPorTitulo, setPagamentosPorTitulo] = useState<Record<number, PagamentoEfetuado[]>>({});
  const [pagamentosCarregando, setPagamentosCarregando] = useState<Record<number, boolean>>({});

  const [confirmDeleteTitulo, setConfirmDeleteTitulo] = useState<number | null>(null);
  const [confirmDeletePagamento, setConfirmDeletePagamento] = useState<PagamentoEfetuado | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const fetchTitulos = useCallback(async (): Promise<TituloPagar[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/titulos-pagar');
      const list = response.data as TituloPagar[];
      setTitulos(list);
      return list;
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      setError(errorData.response?.data?.error || errorData.message || 'Erro ao carregar títulos');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTitulos(); }, [fetchTitulos]);

  const totais = useMemo(() => {
    const totalTitulos = titulos.reduce((acc, titulo) => acc + Number(titulo.valorTotal ?? 0), 0);
    const totalPago = titulos.reduce((acc, titulo) => acc + Number(titulo.totalPago ?? 0), 0);
    return { totalTitulos, totalPago, saldo: totalTitulos - totalPago };
  }, [titulos]);

  const fetchPagamentos = useCallback(async (tituloId: number) => {
    setPagamentosCarregando((prev) => ({ ...prev, [tituloId]: true }));
    try {
      const response = await api.get('/pagamentos-efetuados', { params: { tituloId } });
      setPagamentosPorTitulo((prev) => ({ ...prev, [tituloId]: response.data as PagamentoEfetuado[] }));
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao carregar pagamentos');
      setPagamentosPorTitulo((prev) => ({ ...prev, [tituloId]: [] }));
    } finally {
      setPagamentosCarregando((prev) => ({ ...prev, [tituloId]: false }));
    }
  }, [addToast]);

  const abrirPagamento = (titulo: TituloPagar) => {
    if (!titulo.id) return;
    setPagamentoTitulo(titulo);
    setPagamentoFormKey((k) => k + 1);
  };

  const fecharPagamento = () => {
    setPagamentoTitulo(null);
  };

  const handleSubmitTitulo = async (data: TituloPagarFormData) => {
    setSaving(true);
    try {
      const payload = editing ? { ...data, id: editing.id } : data;
      await api.post('/titulos-pagar', payload);
      setModalOpen(false);
      setEditing(null);
      await fetchTitulos();
      addToast('success', editing ? 'Título atualizado com sucesso' : 'Título cadastrado com sucesso');
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao salvar título');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTitulo = async () => {
    if (confirmDeleteTitulo === null) return;
    setActionLoading(true);
    try {
      await api.delete('/titulos-pagar', { params: { id: confirmDeleteTitulo } });
      setPagamentosPorTitulo((prev) => {
        const next = { ...prev };
        delete next[confirmDeleteTitulo];
        return next;
      });
      setConfirmDeleteTitulo(null);
      await fetchTitulos();
      addToast('success', 'Título e pagamentos excluídos com sucesso');
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao excluir título');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePagamentoSubmit = async (data: PagamentoTituloFormData) => {
    if (!pagamentoTitulo?.id) return;
    const tituloId = pagamentoTitulo.id;
    const tituloAtual = pagamentoTitulo;
    setPagamentoSaving(true);
    try {
      const response = await api.post('/pagamentos-efetuados', { tituloId, ...data });
      const status = (response.data as { status?: string }).status;
      const list = await fetchTitulos();
      const atualizado = list.find((t) => t.id === tituloId);
      const baixado = status === 'QUITADO' || atualizado?.status === 'QUITADO';

      await fetchPagamentos(tituloId);

      if (baixado) {
        fecharPagamento();
        addToast('success', 'Pagamento registrado. Título baixado.');
      } else {
        const tituloAtualizado = atualizado ?? {
          ...tituloAtual,
          totalPago: Number(tituloAtual.totalPago ?? 0) + data.valorPago,
          saldoDevedor: Math.max(0, Number(tituloAtual.saldoDevedor ?? 0) - data.valorPago),
        };
        setPagamentoTitulo(tituloAtualizado);
        setPagamentoFormKey((k) => k + 1);
        addToast('success', 'Pagamento parcial registrado.');
      }
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao registrar pagamento');
    } finally {
      setPagamentoSaving(false);
    }
  };

  const handleDeletePagamento = async () => {
    if (confirmDeletePagamento === null) return;
    const pagamento = confirmDeletePagamento;
    const tituloId = pagamento.tituloId;
    setActionLoading(true);
    try {
      await api.delete('/pagamentos-efetuados', { params: { id: pagamento.id } });
      setConfirmDeletePagamento(null);
      const list = await fetchTitulos();
      await fetchPagamentos(tituloId);
      if (pagamentoTitulo?.id === tituloId) {
        const atualizado = list.find((t) => t.id === tituloId);
        if (atualizado) {
          setPagamentoTitulo(atualizado);
          setPagamentoFormKey((k) => k + 1);
        }
      }
      addToast('success', 'Pagamento excluído. Status do título recalculado.');
    } catch (err: unknown) {
      const errorData = err as { response?: { data?: { error?: string } }; message?: string };
      addToast('error', errorData.response?.data?.error || errorData.message || 'Erro ao excluir pagamento');
    } finally {
      setActionLoading(false);
    }
  };

  const renderPagamentos = (titulo: TituloPagar): JSX.Element => {
    const tituloId = titulo.id ?? 0;
    const lista = pagamentosPorTitulo[tituloId];
    const carregando = pagamentosCarregando[tituloId];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-text-primary">Pagamentos registrados</h4>
          <span className="text-xs text-text-secondary">
            Total pago: <strong className="text-text-primary">{formatCurrency(Number(titulo.totalPago ?? 0))}</strong>
            {' · '}Saldo: <strong className="text-accent-primary">{formatCurrency(Number(titulo.saldoDevedor ?? 0))}</strong>
          </span>
        </div>

        {carregando || !lista ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary" />
          </div>
        ) : lista.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhum pagamento informado para este título.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-primary bg-bg-card">
            <table className="w-full text-sm">
              <thead className="bg-bg-muted/50 text-xs uppercase text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Forma</th>
                  <th className="px-3 py-2 text-left">Observação</th>
                  <th className="px-3 py-2 text-left">Usuário</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {lista.map((pagamento) => (
                  <tr key={pagamento.id}>
                    <td className="px-3 py-2 text-text-primary">{formatDate(pagamento.dataPagamento)}</td>
                    <td className="px-3 py-2 text-right font-mono text-text-primary">{formatCurrency(Number(pagamento.valorPago))}</td>
                    <td className="px-3 py-2 text-text-secondary">{pagamento.formaPagamento || '-'}</td>
                    <td className="px-3 py-2 text-text-secondary">{pagamento.observacao || '-'}</td>
                    <td className="px-3 py-2 text-text-secondary">{pagamento.usuarioNome || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <ShowForPermission rota="/titulos-pagar" acao={ACAO.EXCLUIR}>
                        <button
                          onClick={() => setConfirmDeletePagamento(pagamento)}
                          className="p-1.5 rounded-lg text-accent-red hover:bg-accent-red/10 transition-colors"
                          title="Excluir pagamento"
                        >
                          <Trash2 size={15} />
                        </button>
                      </ShowForPermission>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const columns = [
    columnHelper.display({
      id: 'expand',
      header: 'Pagamentos',
      enableColumnFilter: false,
      enableSorting: false,
      size: 130,
      meta: {
        expand: true,
        expandLabel: 'Ver',
        expandLabelExpanded: 'Ocultar',
      } as Record<string, unknown>,
    }),
    columnHelper.accessor('credor', {
      header: 'Credor',
      cell: (info) => (
        <div>
          <p className="font-medium text-text-primary">{info.getValue()}</p>
          {info.row.original.descricao && (
            <p className="text-xs text-text-secondary truncate max-w-[220px]">{info.row.original.descricao}</p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('numeroDocumento', {
      header: 'Documento',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('valorTotal', {
      header: 'Valor Total',
      cell: (info) => <span className="font-mono">{formatCurrency(Number(info.getValue()))}</span>,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('totalPago', {
      header: 'Pago',
      cell: (info) => <span className="font-mono">{formatCurrency(Number(info.getValue() ?? 0))}</span>,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('saldoDevedor', {
      header: 'Saldo',
      cell: (info) => <span className="font-mono">{formatCurrency(Number(info.getValue() ?? 0))}</span>,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('dataVencimento', {
      header: 'Vencimento',
      cell: (info) => formatDate(info.getValue()),
      sortingFn: 'datetime',
    }),
    columnHelper.accessor((row) => statusDoTitulo(row).label, {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = statusDoTitulo(row.original);
        return <span className={`status-badge ${status.className}`}>{status.label}</span>;
      },
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Ações',
      enableColumnFilter: false,
      enableSorting: false,
      cell: ({ row }) => {
        const podePagar = row.original.status !== 'QUITADO'
          && row.original.status !== 'CANCELADO'
          && Number(row.original.saldoDevedor ?? 0) > 0;

        return (
          <div className="flex justify-end">
            <RowActions
              icon={Menu}
              rota="/titulos-pagar"
              onEdit={() => { setEditing(row.original); setModalOpen(true); }}
              onDelete={() => setConfirmDeleteTitulo(row.original.id!)}
              extras={podePagar ? [
                {
                  rotulo: 'Informar Pagamento',
                  icone: CircleDollarSign,
                  cor: '#16a34a',
                  onClick: () => abrirPagamento(row.original),
                  permissaoRota: '/titulos-pagar',
                  permissaoAcao: ACAO.BAIXAR,
                },
              ] : []}
            />
          </div>
        );
      },
    }),
  ];

  return (
    <Layout>
      <PageHeader title="Títulos a Pagar" subtitle="Gerencie os títulos e seus pagamentos">
        <ShowForPermission rota="/titulos-pagar" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} /> Novo Título
          </Button>
        </ShowForPermission>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Total de Títulos a Pagar</p>
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-accent-red">{formatCurrency(totais.totalTitulos)}</p>
          <p className="text-xs text-text-muted mt-1">{titulos.length} título(s) cadastrado(s)</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Total de Pagamentos Efetivados</p>
            <div className="p-2 bg-green-100 rounded-lg">
              <CircleDollarSign size={20} className="text-accent-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-accent-primary">{formatCurrency(totais.totalPago)}</p>
          <p className="text-xs text-text-muted mt-1">Total efetivamente pago</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-secondary">Saldo</p>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wallet size={20} className="text-purple-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${totais.saldo > 0 ? 'text-accent-red' : 'text-accent-primary'}`}>
            {formatCurrency(totais.saldo)}
          </p>
          <p className="text-xs text-text-muted mt-1">Títulos a pagar menos pagamentos efetivados</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => void fetchTitulos()}
            className="p-2 rounded-lg border border-border-primary hover:bg-background-hover transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={18} className="text-text-secondary" />
          </button>
        </div>
        <DataTable
          columns={columns}
          data={titulos}
          loading={loading}
          error={error}
          emptyMessage="Nenhum título encontrado"
          onExpand={(titulo) => { if (titulo.id) void fetchPagamentos(titulo.id); }}
          renderSubComponent={renderPagamentos}
        />
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? 'Editar Título a Pagar' : 'Novo Título a Pagar'}
      >
        <TituloPagarForm
          key={`titulo-pagar-${editing?.id ?? 'new'}`}
          onSubmit={handleSubmitTitulo}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          initial={editing}
          loading={saving}
        />
      </Modal>

      <Modal
        isOpen={!!pagamentoTitulo}
        onClose={fecharPagamento}
        title="Informar Pagamento"
        maxWidth="max-w-2xl"
      >
        {pagamentoTitulo && (
          <PagamentoTituloForm
            key={`pagamento-${pagamentoTitulo.id}-${pagamentoFormKey}`}
            titulo={pagamentoTitulo}
            onSubmit={handlePagamentoSubmit}
            onCancel={fecharPagamento}
            loading={pagamentoSaving}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDeleteTitulo !== null}
        onClose={() => setConfirmDeleteTitulo(null)}
        onConfirm={handleDeleteTitulo}
        title="Excluir Título"
        message="Tem certeza que deseja excluir este título? Todos os pagamentos vinculados também serão excluídos. Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={confirmDeletePagamento !== null}
        onClose={() => setConfirmDeletePagamento(null)}
        onConfirm={handleDeletePagamento}
        title="Excluir Pagamento"
        message="Tem certeza que deseja excluir este pagamento? O status do título será recalculado."
        variant="danger"
        confirmLabel="Excluir"
        loading={actionLoading}
      />
    </Layout>
  );
}
