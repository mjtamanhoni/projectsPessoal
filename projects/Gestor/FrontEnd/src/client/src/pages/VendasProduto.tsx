import { useState, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, createColumnHelper } from '@/components/ui/DataTable';
import { VendaProdutoForm } from '@/components/forms/VendaProdutoForm';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import type { VendaProduto, VendaProdutoItem, ProdutoFabricado, Cliente } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, Printer, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDate, formatDecimals } from '@/lib/utils';
import { gerarTextoCupom, imprimirCupomSerial } from '@/lib/cupom';
import { gerarPDFCupom } from '@/lib/cupom-pdf';
import api from '@/lib/api';
import { getCachedSettings } from '@/lib/settings';
import { useAuth } from '@/context/AuthContext';
import { viewPDF } from '@/lib/pdf';
import type { JSX } from 'react';

const columnHelper = createColumnHelper<VendaProduto>();

export function VendasProduto() {
  const { data: vendas, loading, error, create, update, remove, refetch } = useApi<VendaProduto>('/vendas-produto');
  const { data: produtos } = useApi<ProdutoFabricado>('/produtos-fabricados');
  const { data: clientes } = useApi<Cliente>('/clientes');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendaProduto | null>(null);
  const [fetchingOne, setFetchingOne] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cupomVenda, setCupomVenda] = useState<VendaProduto | null>(null);
  const [cupomModalOpen, setCupomModalOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [loadedItens, setLoadedItens] = useState<Record<number, VendaProdutoItem[]>>({});
  const { empresa } = useAuth();
  const { addToast } = useToast();

  const fetchItens = useCallback(async (vendaId: number) => {
    try {
      const response = await api.get('/vendas-produto', { params: { id: vendaId } });
      const rows = response.data as any[];
      const itens = rows.map((row: any) => ({
        item_id: row.item_id,
        produto_fabricado_id: row.produto_fabricado_id,
        produto_nome: row.produto_nome,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
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
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.item_valor_total ?? row.valor_total),
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

  const handlePrintCupom = async (venda: VendaProduto) => {
    const full = await fetchFullVenda(venda.id ?? venda.codigo ?? 0);
    setCupomVenda(full ?? venda);
    setCupomModalOpen(true);
  };

  const buildCupomData = (venda: VendaProduto) => {
    const cliente = clientes?.find((c) => c.id === venda.cliente_id || c.codigo === venda.cliente_id) ?? null;
    return {
      empresaNome: empresa?.fantasia || empresa?.razao_social || 'EMPRESA',
      empresaCnpj: empresa?.cnpj_cpf || '',
      empresaEndereco: empresa?.endereco || '',
      empresaTelefone: empresa?.celular || empresa?.telefone || '',
      empresaEmail: empresa?.email || '',
      venda,
      cliente,
      numeroCupom: venda.id ?? venda.codigo ?? 0,
      formaPagamento: venda.recebido ? 'A VISTA' : 'CREDIARIO / PARCELADO',
      parcelas: [] as { numero: number; total: number; vencimento: string; valor: number }[],
      desconto: 0,
      logoBase64: null as string | null,
    };
  };

  const handleThermalPrint = async (venda: VendaProduto) => {
    const settings = getCachedSettings();
    if (!settings?.printer || !settings.printer.porta) {
      addToast('error', 'Impressora termica nao configurada. Va em Configuracoes > Impressao.');
      return;
    }
    setPrinting(true);
    try {
      const texto = gerarTextoCupom(buildCupomData(venda));
      const textoImpressao = imprimirCupomSerial(texto);
      await api.post('/print/cupom', {
        texto: textoImpressao,
        modelo: settings.printer.modelo,
        porta: settings.printer.porta,
        deviceParams: settings.printer.deviceParams,
        colunas: settings.printer.colunas,
        cortarPapel: settings.printer.cortarPapel,
        espacoEntreLinhas: settings.printer.espacoEntreLinhas,
        linhasBuffer: settings.printer.linhasBuffer,
        linhasPular: settings.printer.linhasPular,
      });
      addToast('success', 'Cupom enviado para impressao');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao imprimir cupom';
      addToast('error', msg);
    } finally {
      setPrinting(false);
    }
  };

  const handleViewPdf = (venda: VendaProduto) => {
    const doc = gerarPDFCupom(buildCupomData(venda));
    viewPDF(doc);
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
        <div className="flex justify-end gap-1">
          <button
            onClick={() => handlePrintCupom(row.original)}
            className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
            title="Cupom"
          >
            <FileText size={16} className="text-text-secondary" />
          </button>
          <ShowForPermission rota="/vendas-produto" acao={ACAO.EDITAR}>
            <button
              onClick={() => handleEdit(row.original)}
              className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <Edit2 size={16} className="text-text-secondary" />
            </button>
          </ShowForPermission>
          <ShowForPermission rota="/vendas-produto" acao={ACAO.EXCLUIR}>
            <button
              onClick={() => setConfirmDelete(row.original.id ?? row.original.codigo!)}
              className="p-1.5 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <Trash2 size={16} className="text-accent-red" />
            </button>
          </ShowForPermission>
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
        setCupomModalOpen(true);
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
        <DataTable
          columns={columns}
          data={vendas}
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
            clientes={clientes}
          />
        )}
      </Modal>

      <Modal isOpen={cupomModalOpen} onClose={() => { setCupomModalOpen(false); setCupomVenda(null); }} title="Cupom Nao Fiscal" maxWidth="max-w-3xl">
        {cupomVenda && (
          <div className="space-y-4">
            <pre className="bg-gray-900 text-green-300 p-4 rounded-lg text-xs font-mono leading-tight overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
              {gerarTextoCupom(buildCupomData(cupomVenda))}
            </pre>
            <div className="flex justify-center gap-3">
              <Button variant="primary" onClick={() => handleThermalPrint(cupomVenda)} disabled={printing}>
                <Printer size={16} /> {printing ? 'Imprimindo...' : 'Impressora Termica'}
              </Button>
              <Button variant="secondary" onClick={() => handleViewPdf(cupomVenda)}>
                <FileText size={16} /> Visualizar PDF
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