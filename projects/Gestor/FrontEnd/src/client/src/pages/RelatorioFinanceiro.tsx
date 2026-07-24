import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import type { ContaPagar, ContaReceber, Cliente, Fornecedor, Categoria } from '@/types';
import { Download, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from '@/lib/pdf';

type SubTab = 'resumo' | 'receber' | 'pagar';

const subTabs: { id: SubTab; label: string }[] = [
  { id: 'resumo', label: 'Resumo Financeiro' },
  { id: 'receber', label: 'Contas a Receber' },
  { id: 'pagar', label: 'Contas a Pagar' },
];

function getMonthRange() {
  const hoje = new Date();
  return {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
    fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0],
  };
}

function usePDFConfirm() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof buildPDFWithHeader> | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');

  const promptPDF = useCallback((doc: ReturnType<typeof buildPDFWithHeader>, filename: string) => {
    setPdfDoc(doc);
    setPdfFilename(filename);
    setShowConfirm(true);
  }, []);

  const handleView = useCallback(() => {
    if (pdfDoc) viewPDF(pdfDoc);
    setShowConfirm(false);
  }, [pdfDoc]);

  const handleCancel = useCallback(() => {
    if (pdfDoc) downloadPDF(pdfDoc, pdfFilename);
    setShowConfirm(false);
  }, [pdfDoc, pdfFilename]);

  return { showConfirm, promptPDF, handleView, handleCancel };
}

function useListaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  useEffect(() => { api.get('/clientes').then((r) => setClientes(r.data as Cliente[])).catch(() => {}); }, []);
  return clientes;
}

function useListaCategoriasReceber() {
  const [cats, setCats] = useState<Categoria[]>([]);
  useEffect(() => { api.get('/categorias/receber').then((r) => setCats(r.data as Categoria[])).catch(() => {}); }, []);
  return cats;
}

function useListaFornecedores() {
  const [forns, setForns] = useState<Fornecedor[]>([]);
  useEffect(() => { api.get('/fornecedores').then((r) => setForns(r.data as Fornecedor[])).catch(() => {}); }, []);
  return forns;
}

function useListaCategoriasPagar() {
  const [cats, setCats] = useState<Categoria[]>([]);
  useEffect(() => { api.get('/categorias/pagar').then((r) => setCats(r.data as Categoria[])).catch(() => {}); }, []);
  return cats;
}

function ResumoFinanceiro() {
  const range = getMonthRange();
  const [dataInicio, setDataInicio] = useState(range.inicio);
  const [dataFim, setDataFim] = useState(range.fim);
  const [status, setStatus] = useState('ambos');
  const [receber, setReceber] = useState<ContaReceber[]>([]);
  const [pagar, setPagar] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const pdfConfirm = usePDFConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { dataInicio, dataFim, status };
      const [r, p] = await Promise.all([
        api.get('/contas-receber', { params }),
        api.get('/contas-pagar', { params }),
      ]);
      setReceber(r.data as ContaReceber[]);
      setPagar(p.data as ContaPagar[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [dataInicio, dataFim, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalReceber = useMemo(() => receber.reduce((acc, c) => acc + Number(c.valor), 0), [receber]);
  const totalPagar = useMemo(() => pagar.reduce((acc, c) => acc + Number(c.valor), 0), [pagar]);
  const totalRecebido = useMemo(() => receber.filter(c => c.recebido).reduce((acc, c) => acc + Number(c.valor), 0), [receber]);
  const totalPago = useMemo(() => pagar.filter(c => c.pago).reduce((acc, c) => acc + Number(c.valor), 0), [pagar]);
  const pendenteReceber = receber.filter(c => !c.recebido).length;
  const pendentePagar = pagar.filter(c => !c.pago).length;

  const handleExport = () => {
    const filename = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.pdf`;

    const filtros: string[] = [
      `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
      `Status: ${status === 'ambos' ? 'Ambos' : status === 'aberto' ? 'Pendente' : 'Pago/Recebido'}`,
    ];

    const doc = buildPDFWithHeader(
      {
        title: 'Relatório Financeiro - Gestor Financeiro',
        emissionDate: new Date().toLocaleDateString('pt-BR'),
        filters: filtros,
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        autoTable(d, {
          head: [['Indicador', 'Valor']],
          body: [
            ['Total a Receber', formatCurrency(totalReceber)],
            ['Total Recebido', formatCurrency(totalRecebido)],
            ['Pendente Receber', pendenteReceber.toString()],
            ['Total a Pagar', formatCurrency(totalPagar)],
            ['Total Pago', formatCurrency(totalPago)],
            ['Pendente Pagar', pendentePagar.toString()],
            ['Saldo Previsto', formatCurrency(totalReceber - totalPagar)],
          ],
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          columnStyles: { 1: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 1) {
              data.cell.styles.halign = 'right';
            }
          },
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = 42;
            }
          },
        });

        const finalY = (d as any).lastAutoTable.finalY;
        d.setFontSize(14);
        d.setFont('helvetica', 'bold');
        d.text('Contas a Receber', 14, finalY + 20);
        autoTable(d, {
          head: [['Descrição', 'Cliente', 'Valor', 'Vencimento', 'Status']],
          body: receber.map(c => [
            c.descricao, c.clienteNome || '-', formatCurrency(Number(c.valor)),
            formatDate(c.dataVencimento), c.recebido ? 'Recebido' : 'Pendente',
          ]),
          startY: finalY + 25,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          columnStyles: { 2: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 2) {
              data.cell.styles.halign = 'right';
            }
          },
        });

        const finalY2 = (d as any).lastAutoTable.finalY;
        d.setFontSize(14);
        d.setFont('helvetica', 'bold');
        d.text('Contas a Pagar', 14, finalY2 + 20);
        autoTable(d, {
          head: [['Descrição', 'Fornecedor', 'Valor', 'Vencimento', 'Status']],
          body: pagar.map(c => [
            c.descricao, c.fornecedorNome || '-', formatCurrency(Number(c.valor)),
            formatDate(c.dataVencimento), c.pago ? 'Pago' : 'Pendente',
          ]),
          startY: finalY2 + 25,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          columnStyles: { 2: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 2) {
              data.cell.styles.halign = 'right';
            }
          },
        });
      }
    );
    pdfConfirm.promptPDF(doc, filename);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-accent-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Resumo Financeiro</h2>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={16} /> Exportar PDF
        </button>
      </div>

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
              <option value="aberto">Pendente</option>
              <option value="pago">Pago/Recebido</option>
            </select>
          </div>
          <button onClick={() => { setDataInicio(range.inicio); setDataFim(range.fim); setStatus('ambos'); }} className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors">Limpar</button>
          <button onClick={fetchData} className="px-4 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors">Filtrar</button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Contas a Receber">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border-subtle">
              <span className="text-text-secondary">Total (Todas)</span>
              <span className="font-semibold font-mono">{formatCurrency(totalReceber)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle">
              <span className="text-text-secondary">Recebido</span>
              <span className="font-semibold font-mono text-accent-primary">{formatCurrency(totalRecebido)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">Pendente</span>
              <span className="font-semibold font-mono text-yellow-600">{formatCurrency(totalReceber - totalRecebido)}</span>
            </div>
          </div>
        </Card>

        <Card title="Contas a Pagar">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border-subtle">
              <span className="text-text-secondary">Total (Todas)</span>
              <span className="font-semibold font-mono">{formatCurrency(totalPagar)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-subtle">
              <span className="text-text-secondary">Pago</span>
              <span className="font-semibold font-mono text-accent-primary">{formatCurrency(totalPago)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">Pendente</span>
              <span className="font-semibold font-mono text-accent-red">{formatCurrency(totalPagar - totalPago)}</span>
            </div>
          </div>
        </Card>

        <Card title="Resumo Geral" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-accent-light rounded-xl">
              <p className="text-sm text-text-secondary mb-1">Saldo Previsto</p>
              <p className={`text-2xl font-bold font-mono ${(totalReceber - totalPagar) >= 0 ? 'text-accent-primary' : 'text-accent-red'}`}>
                {formatCurrency(totalReceber - totalPagar)}
              </p>
            </div>
            <div className="text-center p-4 bg-accent-light rounded-xl">
              <p className="text-sm text-text-secondary mb-1">Contas a Receber</p>
              <p className="text-2xl font-bold font-mono text-accent-primary">{pendenteReceber}</p>
              <p className="text-xs text-text-muted mt-1">pendentes</p>
            </div>
            <div className="text-center p-4 bg-accent-light rounded-xl">
              <p className="text-sm text-text-secondary mb-1">Contas a Pagar</p>
              <p className="text-2xl font-bold font-mono text-accent-red">{pendentePagar}</p>
              <p className="text-xs text-text-muted mt-1">pendentes</p>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={pdfConfirm.showConfirm}
        onClose={pdfConfirm.handleCancel}
        onConfirm={pdfConfirm.handleView}
        title="Visualizar Relatório"
        message="Tem certeza que deseja visualizar o relatório?"
        variant="success"
        confirmLabel="Visualizar"
      />
    </div>
  );
}

function RelacaoContasReceber() {
  const range = getMonthRange();
  const [dataInicio, setDataInicio] = useState(range.inicio);
  const [dataFim, setDataFim] = useState(range.fim);
  const [status, setStatus] = useState('ambos');
  const [clienteId, setClienteId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(false);
  const clientes = useListaClientes();
  const categorias = useListaCategoriasReceber();
  const pdfConfirm = usePDFConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { dataInicio, dataFim, status };
      if (clienteId) params.clienteId = clienteId;
      if (categoriaId) params.categoriaId = categoriaId;
      const res = await api.get('/contas-receber', { params });
      setContas(res.data as ContaReceber[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [dataInicio, dataFim, status, clienteId, categoriaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const title = 'Relação de Contas a Receber';
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    const filtros: string[] = [
      `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
      `Status: ${status === 'ambos' ? 'Ambos' : status === 'aberto' ? 'Pendente' : 'Recebido'}`,
    ];
    const clienteNome = clientes.find(c => String(c.id ?? c.codigo) === clienteId)?.nome;
    if (clienteNome) filtros.push(`Cliente: ${clienteNome}`);
    const catNome = categorias.find(c => String(c.id ?? c.codigo) === categoriaId)?.nome;
    if (catNome) filtros.push(`Categoria: ${catNome}`);

    const doc = buildPDFWithHeader(
      {
        title,
        emissionDate: new Date().toLocaleDateString('pt-BR'),
        filters: filtros,
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        autoTable(d, {
          head: [['Descrição', 'Cliente', 'Valor', 'Vencimento', 'Categoria', 'Status']],
          body: contas.map(c => [
            c.descricao, c.clienteNome || '-', formatCurrency(Number(c.valor)),
            formatDate(c.dataVencimento), c.categoriaNome || '-',
            c.recebido ? 'Recebido' : 'Pendente',
          ]),
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 8 },
          columnStyles: { 2: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 2) {
              data.cell.styles.halign = 'right';
            }
          },
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = 42;
            }
          },
        });
      }
    );
    pdfConfirm.promptPDF(doc, filename);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Relação de Contas a Receber</h2>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" disabled={contas.length === 0}>
          <Download size={16} /> Exportar PDF
        </button>
      </div>

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
              <option value="aberto">Pendente</option>
              <option value="recebido">Recebido</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm">
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id ?? c.codigo} value={c.id ?? c.codigo}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Categoria</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm">
              <option value="">Todos</option>
              {categorias.map((c) => (
                <option key={c.id ?? c.codigo} value={c.id ?? c.codigo}>{c.nome}</option>
              ))}
            </select>
          </div>
          <button onClick={() => { setDataInicio(range.inicio); setDataFim(range.fim); setStatus('ambos'); setClienteId(''); setCategoriaId(''); }} className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors">Limpar</button>
          <button onClick={fetchData} className="px-4 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors">Filtrar</button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-accent-primary" /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Descrição</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Cliente</th>
                  <th className="text-right text-sm font-medium text-text-secondary py-3 px-4">Valor</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Vencimento</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Categoria</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {contas.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-text-muted">Nenhum registro encontrado</td></tr>
                ) : contas.map((c) => (
                  <tr key={c.id ?? c.codigo} className="border-b border-border-subtle hover:bg-bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-sm">{c.descricao}</td>
                    <td className="py-3 px-4 text-sm">{c.clienteNome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono">{formatCurrency(Number(c.valor))}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(c.dataVencimento)}</td>
                    <td className="py-3 px-4 text-sm">{c.categoriaNome || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`status-badge ${c.recebido ? 'pago' : 'pendente'}`}>{c.recebido ? 'Recebido' : 'Pendente'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        isOpen={pdfConfirm.showConfirm}
        onClose={pdfConfirm.handleCancel}
        onConfirm={pdfConfirm.handleView}
        title="Visualizar Relatório"
        message="Tem certeza que deseja visualizar o relatório?"
        variant="success"
        confirmLabel="Visualizar"
      />
    </div>
  );
}

function RelacaoContasPagar() {
  const range = getMonthRange();
  const [dataInicio, setDataInicio] = useState(range.inicio);
  const [dataFim, setDataFim] = useState(range.fim);
  const [status, setStatus] = useState('ambos');
  const [fornecedorId, setFornecedorId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const fornecedores = useListaFornecedores();
  const categorias = useListaCategoriasPagar();
  const pdfConfirm = usePDFConfirm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { dataInicio, dataFim, status };
      if (fornecedorId) params.fornecedorId = fornecedorId;
      if (categoriaId) params.categoriaId = categoriaId;
      const res = await api.get('/contas-pagar', { params });
      setContas(res.data as ContaPagar[]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [dataInicio, dataFim, status, fornecedorId, categoriaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    const title = 'Relação de Contas a Pagar';
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    const filtros: string[] = [
      `Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
      `Status: ${status === 'ambos' ? 'Ambos' : status === 'aberto' ? 'Pendente' : 'Pago'}`,
    ];
    const fornNome = fornecedores.find(f => String(f.id ?? f.codigo) === fornecedorId)?.nome;
    if (fornNome) filtros.push(`Fornecedor: ${fornNome}`);
    const catNome = categorias.find(c => String(c.id ?? c.codigo) === categoriaId)?.nome;
    if (catNome) filtros.push(`Categoria: ${catNome}`);

    const doc = buildPDFWithHeader(
      {
        title,
        emissionDate: new Date().toLocaleDateString('pt-BR'),
        filters: filtros,
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        autoTable(d, {
          head: [['Descrição', 'Fornecedor', 'Valor', 'Vencimento', 'Categoria', 'Status']],
          body: contas.map(c => [
            c.descricao, c.fornecedorNome || '-', formatCurrency(Number(c.valor)),
            formatDate(c.dataVencimento), c.categoriaNome || '-',
            c.pago ? 'Pago' : 'Pendente',
          ]),
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 8 },
          columnStyles: { 2: { halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'head' && data.column.index === 2) {
              data.cell.styles.halign = 'right';
            }
          },
          willDrawPage: (data: any) => {
            if (data.pageNumber > 1 && drawPageHeader) {
              drawPageHeader(d);
              if (data.cursor) data.cursor.y = 42;
            }
          },
        });
      }
    );
    pdfConfirm.promptPDF(doc, filename);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Relação de Contas a Pagar</h2>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" disabled={contas.length === 0}>
          <Download size={16} /> Exportar PDF
        </button>
      </div>

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
              <option value="aberto">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Fornecedor</label>
            <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm">
              <option value="">Todos</option>
              {fornecedores.map((f) => (
                <option key={f.id ?? f.codigo} value={f.id ?? f.codigo}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Categoria</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="px-3 py-2 border border-border-primary rounded-lg bg-background-primary text-text-primary text-sm">
              <option value="">Todos</option>
              {categorias.map((c) => (
                <option key={c.id ?? c.codigo} value={c.id ?? c.codigo}>{c.nome}</option>
              ))}
            </select>
          </div>
          <button onClick={() => { setDataInicio(range.inicio); setDataFim(range.fim); setStatus('ambos'); setFornecedorId(''); setCategoriaId(''); }} className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors">Limpar</button>
          <button onClick={fetchData} className="px-4 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors">Filtrar</button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-accent-primary" /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Descrição</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Fornecedor</th>
                  <th className="text-right text-sm font-medium text-text-secondary py-3 px-4">Valor</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Vencimento</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Categoria</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {contas.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-text-muted">Nenhum registro encontrado</td></tr>
                ) : contas.map((c) => (
                  <tr key={c.id ?? c.codigo} className="border-b border-border-subtle hover:bg-bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-sm">{c.descricao}</td>
                    <td className="py-3 px-4 text-sm">{c.fornecedorNome || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono">{formatCurrency(Number(c.valor))}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(c.dataVencimento)}</td>
                    <td className="py-3 px-4 text-sm">{c.categoriaNome || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`status-badge ${c.pago ? 'pago' : 'pendente'}`}>{c.pago ? 'Pago' : 'Pendente'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        isOpen={pdfConfirm.showConfirm}
        onClose={pdfConfirm.handleCancel}
        onConfirm={pdfConfirm.handleView}
        title="Visualizar Relatório"
        message="Tem certeza que deseja visualizar o relatório?"
        variant="success"
        confirmLabel="Visualizar"
      />
    </div>
  );
}

export function RelatorioFinanceiro() {
  const [subTab, setSubTab] = useState<SubTab>('resumo');

  return (
    <Layout>
      <PageHeader title="Relatorio Financeiro" subtitle="Relatorios financeiros do sistema" />

      <div className="flex gap-2 mb-6 flex-wrap">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              subTab === t.id
                ? 'bg-accent-primary text-white shadow-sm'
                : 'bg-bg-muted text-text-secondary hover:bg-border-subtle'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'resumo' && <ResumoFinanceiro />}
      {subTab === 'receber' && <RelacaoContasReceber />}
      {subTab === 'pagar' && <RelacaoContasPagar />}
    </Layout>
  );
}
