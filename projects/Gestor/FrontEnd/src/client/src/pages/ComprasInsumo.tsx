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
import { CompraInsumoForm } from '@/components/forms/CompraInsumoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { CompraInsumo, CompraInsumoItem, Fornecedor, Insumo, Marca } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowActions } from '@/components/ui/RowActions';
import { formatCurrency, formatDate, formatDecimals } from '@/lib/utils';
import { getDecimalPlaces } from '@/lib/settings';
import api from '@/lib/api';
import type { JSX } from 'react';

const columnHelper = createColumnHelper<CompraInsumo>();

export function ComprasInsumo() {
  const { data: compras, loading, error, create, update, remove, refetch } = useApi<CompraInsumo>('/compras-insumo');
  const [periodo, setPeriodo] = useState<FiltroPeriodo>(mesCorrente());
  const [filtroPago, setFiltroPago] = useState<string>('aberto');

  const comprasFiltradas = useMemo(
    () =>
      (compras ?? []).filter(
        (c) =>
          passaPeriodo(c.data_compra, periodo) &&
          (filtroPago === 'todos' || (filtroPago === 'pago' ? c.pago === true : c.pago !== true)),
      ),
    [compras, periodo, filtroPago],
  );
  const { data: insumos } = useApi<Insumo>('/insumos');
  const { data: fornecedores } = useApi<Fornecedor>('/fornecedores');
  const { data: marcas } = useApi<Marca>('/marcas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompraInsumo | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loadedItens, setLoadedItens] = useState<Record<number, CompraInsumoItem[]>>({});
  const { addToast } = useToast();

  const fetchItens = useCallback(async (compraId: number) => {
    try {
      const response = await api.get('/compras-insumo', { params: { id: compraId } });
      const rows = response.data as any[];
      const itens = rows.map((row: any) => ({
        insumo_id: row.insumo_id,
        insumo_nome: row.insumo_nome,
        marca_nome: row.marca_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
      }));
      setLoadedItens((prev) => ({ ...prev, [compraId]: itens }));
    } catch {
      setLoadedItens((prev) => ({ ...prev, [compraId]: [] }));
    }
  }, []);

  const renderSubComponent = useCallback((row: CompraInsumo): JSX.Element => {
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
            <th className="text-left px-2 py-1 font-medium">Insumo</th>
            <th className="text-left px-2 py-1 font-medium">Marca</th>
            <th className="text-right px-2 py-1 font-medium">Qtd.</th>
            <th className="text-right px-2 py-1 font-medium">Valor Unit.</th>
            <th className="text-right px-2 py-1 font-medium">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, i) => {
            const insumo = insumos.find((s) => (s.id ?? s.codigo) === item.insumo_id);
            const marcaNome = item.marca_nome || insumo?.marca_nome || '-';
            return (
              <tr key={i} className="border-t border-border-primary/50">
                <td className="px-2 py-1.5">{insumo?.nome ?? item.insumo_nome ?? `ID ${item.insumo_id}`}</td>
                <td className="px-2 py-1.5">{marcaNome}</td>
                <td className="text-right px-2 py-1.5">{item.quantidade.toFixed(getDecimalPlaces()).replace('.', ',')}</td>
                <td className="text-right px-2 py-1.5">{formatDecimals(item.valor_unitario, 4)}</td>
                <td className="text-right px-2 py-1.5 font-medium">{formatCurrency(item.valor_total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }, [loadedItens, insumos]);

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
    columnHelper.accessor('fornecedor_nome', {
      header: 'Fornecedor',
      enableSorting: true,
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('data_compra', {
      header: 'Data',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('pago', {
      header: 'Paga',
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
      header: '',
      enableColumnFilter: false,
      enableSorting: false,
      size: 60,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            rota="/compras-insumo"
            onEdit={() => handleEdit(row.original)}
            onDelete={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
          />
        </div>
      ),
    }),
  ];

  const handleEdit = async (compra: CompraInsumo) => {
    const idToFetch = compra.id || compra.codigo;
    if (!idToFetch) return;
    setFetchingOne(true);
    setModalOpen(true);
    setEditing(null);
    setFormKey((k) => k + 1);
    try {
      const response = await api.get('/compras-insumo', { params: { id: idToFetch } });
      const rows = response.data as any[];
      const itens = rows.map((row: any) => ({
        insumo_id: row.insumo_id,
        insumo_nome: row.insumo_nome,
        marca_nome: row.marca_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
      }));
      setLoadedItens((prev) => ({ ...prev, [idToFetch]: itens }));
      setEditing({ ...compra, itens });
    } catch {
      setEditing(compra);
    } finally {
      setFetchingOne(false);
    }
  };

  const handleSubmit = async (data: CompraInsumo) => {
    try {
      if (editing) {
        await update({ ...data, id: editing.id ?? editing.codigo });
      } else {
        await create(data);
      }
      setModalOpen(false);
      setEditing(null);
      setLoadedItens({});
      addToast('success', editing ? 'Compra atualizada com sucesso' : 'Compra cadastrada com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar compra';
      addToast('error', msg);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete === null) return;
    setDeleting(true);
    try {
      await remove(confirmDelete);
      setConfirmDelete(null);
      addToast('success', 'Compra excluída com sucesso');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir compra';
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
      <PageHeader title="Compras de Insumos" subtitle="Gerencie compras de insumos">
        <ShowForPermission rota="/compras-insumo" acao={ACAO.INCLUIR}>
          <Button onClick={openNew}>
            <Plus size={18} /> Nova Compra
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
            valor: filtroPago,
            opcoes: [
              { valor: 'aberto', label: 'Abertas' },
              { valor: 'pago', label: 'Pagas' },
              { valor: 'todos', label: 'Todas' },
            ],
            onChange: setFiltroPago,
          }}
          onLimpar={() => {
            setPeriodo({ inicio: '', fim: '' });
            setFiltroPago('aberto');
          }}
        />
        <DataTable
          columns={columns}
          data={comprasFiltradas}
          loading={loading}
          error={error}
          emptyMessage="Nenhuma compra cadastrada"
          renderSubComponent={renderSubComponent}
          onExpand={(row) => { if (row.id) fetchItens(row.id); }}
        />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Compra' : 'Nova Compra'} maxWidth="max-w-2xl">
        {fetchingOne ? (
          <Spinner />
        ) : (
          <CompraInsumoForm
            key={`compra-form-${editing?.id ?? editing?.codigo ?? `new-${formKey}`}`}
            onSubmit={handleSubmit}
            onCancel={() => { setModalOpen(false); setEditing(null); }}
            initial={editing}
            insumos={insumos}
            fornecedores={fornecedores}
            marcas={marcas}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Compra"
        message="Tem certeza que deseja excluir esta compra? Esta ação não pode ser feita."
        variant="danger"
        confirmLabel="Excluir"
        loading={deleting}
      />
    </Layout>
  );
}
