import { useState } from 'react';
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
import type { VendaProduto, ProdutoFabricado, Cliente } from '@/types';
import { ShowForPermission } from '@/components/ui/ShowForPermission';
import { ACAO } from '@/lib/permissions';
import { Plus, Edit2, Trash2, RefreshCw, Printer, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDate } from '@/lib/utils';
import { gerarTextoCupom, imprimirCupomSerial } from '@/lib/cupom';
import { gerarPDFCupom } from '@/lib/cupom-pdf';
import api from '@/lib/api';
import { getCachedSettings } from '@/lib/settings';
import { useAuth } from '@/context/AuthContext';
import { viewPDF } from '@/lib/pdf';

const columnHelper = createColumnHelper<VendaProduto>();

export function VendasProduto() {
  const { data: vendas, loading, error, create, update, remove, fetchOne, refetch } = useApi<VendaProduto>('/vendas-produto');
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
  const { empresa } = useAuth();
  const { addToast } = useToast();

  const handlePrintCupom = async (venda: VendaProduto) => {
    setCupomVenda(venda);
    setCupomModalOpen(true);
  };

  const handleThermalPrint = async (venda: VendaProduto) => {
    const settings = getCachedSettings();
    if (!settings?.printer || !settings.printer.porta) {
      addToast('error', 'Impressora termica nao configurada. Va em Configuracoes > Impressao.');
      return;
    }
    setPrinting(true);
    try {
      const cliente = clientes?.find((c) => c.id === venda.cliente_id || c.codigo === venda.cliente_id) ?? null;
      const texto = gerarTextoCupom({
        empresaNome: empresa?.fantasia || empresa?.razao_social || 'EMPRESA',
        empresaCnpj: empresa?.cnpj_cpf || '',
        empresaEndereco: empresa?.endereco || '',
        empresaTelefone: empresa?.telefone || '',
        venda,
        cliente,
        numeroCupom: venda.id ?? venda.codigo ?? 0,
        formaPagamento: venda.recebido ? 'A VISTA' : 'CREDIARIO / PARCELADO',
        parcelas: [],
        desconto: 0,
        logoBase64: null,
      });
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
    const settings = getCachedSettings();
    const cliente = clientes?.find((c) => c.id === venda.cliente_id || c.codigo === venda.cliente_id) ?? null;
    const doc = gerarPDFCupom({
      empresaNome: empresa?.fantasia || empresa?.razao_social || 'EMPRESA',
      empresaCnpj: empresa?.cnpj_cpf || '',
      empresaEndereco: empresa?.endereco || '',
      empresaTelefone: empresa?.telefone || '',
      venda,
      cliente,
      numeroCupom: venda.id ?? venda.codigo ?? 0,
      formaPagamento: venda.recebido ? 'A VISTA' : 'CREDIARIO / PARCELADO',
      parcelas: [],
      desconto: 0,
      logoBase64: null,
    });
    viewPDF(doc);
  };

  const columns = [
    columnHelper.accessor((row) => row.id ?? row.codigo, {
      id: 'codigo',
      header: 'Codigo',
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('produto_nome', {
      header: 'Produto',
      enableSorting: true,
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('cliente_nome', {
      header: 'Cliente',
      enableSorting: true,
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('quantidade', {
      header: 'Quantidade',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? Number(value).toFixed(2) : '-';
      },
      enableSorting: true,
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('valor_unitario', {
      header: 'Valor Unitario',
      cell: (info) => formatCurrency(Number(info.getValue())),
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('valor_total', {
      header: 'Valor Total',
      cell: (info) => formatCurrency(Number(info.getValue())),
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.accessor('data_venda', {
      header: 'Data',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('contas_receber_id', {
      header: 'Conta Receber',
      cell: (info) => {
        const value = info.getValue();
        return value != null ? `#${value}` : '-';
      },
      meta: { align: 'right' } as Record<string, string>,
    }),
    columnHelper.display({
      id: 'acoes',
      header: 'Acoes',
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
    try {
      const fetched = await fetchOne(idToFetch);
      setEditing(fetched ?? venda);
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
        const resp = (await create(data)) as { codigo?: number; contas_receber_id?: number } | null | undefined;
        vendaSalva = {
          ...data,
          codigo: resp?.codigo ?? data.codigo,
          id: resp?.codigo ?? data.codigo,
          contas_receber_id: resp?.contas_receber_id ?? data.contas_receber_id,
          produto_nome: produtos?.find((p) => p.id === data.produto_fabricado_id || p.codigo === data.produto_fabricado_id)?.nome,
          cliente_nome: clientes?.find((c) => c.id === data.cliente_id || c.codigo === data.cliente_id)?.nome,
        };
      }
      setModalOpen(false);
      setEditing(null);
      addToast('success', editing ? 'Venda atualizada com sucesso' : 'Venda cadastrada com sucesso');
      if (vendaSalva) {
        setCupomVenda(vendaSalva);
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

  return (
    <Layout>
      <PageHeader title="Vendas de Produtos" subtitle="Gerencie vendas de produtos">
        <ShowForPermission rota="/vendas-produto" acao={ACAO.INCLUIR}>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
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
        <DataTable columns={columns} data={vendas} loading={loading} error={error} emptyMessage="Nenhuma venda cadastrada" />
      </Card>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Editar Venda' : 'Nova Venda'}>
        {fetchingOne ? (
          <Spinner />
        ) : (
          <VendaProdutoForm
            key={`venda-form-${editing?.id ?? editing?.codigo ?? 'new'}`}
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
              {(() => {
                const cliente = clientes?.find((c) => c.id === cupomVenda.cliente_id || c.codigo === cupomVenda.cliente_id) ?? null;
                return gerarTextoCupom({
                  empresaNome: empresa?.fantasia || empresa?.razao_social || 'EMPRESA',
                  empresaCnpj: empresa?.cnpj_cpf || '',
                  empresaEndereco: empresa?.endereco || '',
                  empresaTelefone: empresa?.telefone || '',
                  venda: cupomVenda,
                  cliente,
                  numeroCupom: cupomVenda.id ?? cupomVenda.codigo ?? 0,
                  formaPagamento: cupomVenda.recebido ? 'A VISTA' : 'CREDIARIO / PARCELADO',
                  parcelas: [],
                  desconto: 0,
                  logoBase64: null,
                });
              })()}
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
