import { useState, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { EncomendaForm } from '@/components/forms/EncomendaForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { Encomenda, EncomendaItem, ProdutoFabricado, Cliente } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, Download } from 'lucide-react';
import { RowActions } from '@/components/ui/RowActions';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDecimals } from '@/lib/utils';
import api from '@/lib/api';
import type { JSX } from 'react';

const columnHelper = createColumnHelper<Encomenda>();

export function Encomendas() {
  const { data: encomendas, loading, error, create, update, remove, refetch } = useApi<Encomenda>('/encomendas');
  const { data: produtos } = useApi<ProdutoFabricado>('/produtos-fabricados');
  const { data: clientes } = useApi<Cliente>('/clientes');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Encomenda | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loadedItens, setLoadedItens] = useState<Record<number, EncomendaItem[]>>({});

  const [baixar, setBaixar] = useState<{ id: number; cliente?: string } | null>(null);
  const [baixarData, setBaixarData] = useState('');
  const [baixarRecebido, setBaixarRecebido] = useState(true);
  const [baixando, setBaixando] = useState(false);

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
    columnHelper.accessor('baixado', {
      header: 'Situação',
      cell: (info) => info.getValue()
        ? <span className="text-accent-green font-medium">Baixada {info.row.original.venda_id ? `(venda #${info.row.original.venda_id})` : ''}</span>
        : <span className="text-accent-red">Em aberto</span>,
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
        const baixada = !!row.original.baixado;
        if (!id || baixada) {
          return null;
        }
        return (
          <div className="flex justify-end">
            <RowActions
              rota="/encomendas"
              onEdit={() => handleEdit(row.original)}
              onDelete={() => setConfirmDelete(id)}
              extras={[
                {
                  rotulo: 'Baixar Encomenda',
                  icone: Download,
                  cor: '#16a34a',
                  onClick: () => { setBaixar({ id, cliente: row.original.cliente_nome }); setBaixarData(new Date().toISOString().slice(0, 10)); setBaixarRecebido(true); },
                  permissaoRota: '/encomendas',
                  permissaoAcao: ACAO.BAIXAR,
                },
              ]}
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

  const handleBaixar = async () => {
    if (!baixar) return;
    setBaixando(true);
    try {
      const resp = (await api.post('/encomendas/gerar-venda', {
        id: baixar.id,
        data_venda: baixarData,
        recebido: baixarRecebido,
      })) as { data?: { venda_id?: number; mensagem?: string } };
      const vendaId = resp?.data?.venda_id;
      setBaixar(null);
      setLoadedItens({});
      await refetch();
      addToast('success', vendaId ? `Venda #${vendaId} gerada com sucesso` : 'Venda gerada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar venda';
      addToast('error', msg);
    } finally {
      setBaixando(false);
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
        <DataTable
          columns={columns}
          data={encomendas}
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

      <Modal isOpen={baixar !== null} onClose={() => setBaixar(null)} title="Baixar Encomenda" maxWidth="max-w-lg">
        {baixar && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              A mercadoria foi entregue? Ao baixar a encomenda será gerada uma venda de produto com os itens desta encomenda (baixa de estoque e contas a receber).{baixar.cliente ? ` Cliente: ${baixar.cliente}.` : ''}
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="label-field">Data da Venda *</label>
                <input type="date" className="input-field" value={baixarData} onChange={(e) => setBaixarData(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="baixar-recebido"
                  checked={baixarRecebido}
                  onChange={(e) => setBaixarRecebido(e.target.checked)}
                  className="rounded border-border-subtle"
                />
                <label htmlFor="baixar-recebido" className="text-sm text-text-secondary whitespace-nowrap">Venda já foi recebida?</label>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setBaixar(null)} disabled={baixando}>Cancelar</Button>
              <Button type="button" variant="primary" onClick={handleBaixar} disabled={baixando || !baixarData}>
                {baixando ? 'Gerando...' : 'Baixar e Gerar Venda'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

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