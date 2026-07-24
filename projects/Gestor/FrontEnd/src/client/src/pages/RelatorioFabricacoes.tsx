import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { Download, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from '@/lib/pdf';

interface CustoInsumoDetalhe {
  insumo_id: number;
  insumo_nome: string;
  quantidade_por_produto: number;
  custo_medio: number;
  valor_gasto: number;
}

interface CustoAdicionalDetalhe {
  custo_adicional_tipo_id: number;
  tipo_nome: string;
  valor: number;
}

interface RelatorioFabricacao {
  id: number;
  produto_fabricado_id: number;
  produto_nome: string;
  quantidade_produzida: number;
  data_fabricacao: string;
  custo_insumos: number;
  custo_adicional_total: number;
  custo_total: number;
  custo_unitario: number;
  estoque_atual: number;
  custos_insumos_detalhe: CustoInsumoDetalhe[];
  custos_adicionais_detalhe: CustoAdicionalDetalhe[];
}

function getMonthRange() {
  const hoje = new Date();
  return {
    inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
    fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0],
  };
}

const { inicio: mesInicio, fim: mesFim } = getMonthRange();

export function RelatorioFabricacoes() {
  const [data, setData] = useState<RelatorioFabricacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof buildPDFWithHeader> | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [dataInicio, setDataInicio] = useState(mesInicio);
  const [dataFim, setDataFim] = useState(mesFim);
  const [ultimoApenas, setUltimoApenas] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    if (ultimoApenas) params.ultimo = 'true';
    api.get('/relatorios-producao/fabricacoes', { params })
      .then((r) => setData(r.data as RelatorioFabricacao[]))
      .catch((err) => {
        const msg = err?.response?.data?.error || err?.message || 'Erro desconhecido';
        console.error('[RelatorioFabricacoes] Erro ao carregar:', err);
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [dataInicio, dataFim, ultimoApenas, fetchTrigger]);

  const fetchData = useCallback(() => {
    setFetchTrigger((v) => v + 1);
  }, []);

  const limparFiltros = () => {
    const { inicio, fim } = getMonthRange();
    setDataInicio(inicio);
    setDataFim(fim);
    setUltimoApenas(false);
  };

  const toggleExpand = (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtQtd = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  const handleExport = useCallback(() => {
    const filename = `relatorio-fabricacoes-${new Date().toISOString().split('T')[0]}.pdf`;
    const doc = buildPDFWithHeader(
      {
        title: 'Relatorio de Fabricacoes',
        emissionDate: new Date().toLocaleDateString('pt-BR'),
      },
      (d, drawPageHeader) => {
        data.forEach((f, idx) => {
          if (idx > 0) {
            d.addPage();
          }
          if (drawPageHeader) drawPageHeader(d);
          const pageW = d.internal.pageSize.getWidth();
          const leftX = 14;
          const rightX = pageW - 14;

          d.setFontSize(14);
          d.setFont('helvetica', 'bold');
          d.setTextColor(45, 94, 58);
          d.text(`Produto fabricado: ${f.produto_nome}`, leftX, 42);

          d.setFontSize(10);
          d.setFont('helvetica', 'normal');
          d.setTextColor(27, 31, 28);
          d.text(`Data da fabricacao: ${new Date(f.data_fabricacao).toLocaleDateString('pt-BR')}`, leftX, 50);
          d.text(`Quantidade Fabricada: ${fmtQtd(f.quantidade_produzida)}`, rightX, 50, { align: 'right' });

          d.setFontSize(10);
          d.setFont('helvetica', 'normal');
          d.setTextColor(27, 31, 28);

          let costY = 58;
          d.text('Estoque atual:', leftX, costY);
          d.text(fmtQtd(f.estoque_atual), rightX, costY, { align: 'right' });

          costY += 7;
          d.text('Custos dos insumos:', leftX, costY);
          d.text(fmt(f.custo_insumos), rightX, costY, { align: 'right' });

          costY += 6;
          d.text('Custos Adicionais:', leftX, costY);
          d.text(fmt(f.custo_adicional_total), rightX, costY, { align: 'right' });

          costY += 3;
          d.setDrawColor(180, 180, 180);
          d.line(leftX, costY, rightX, costY);

          costY += 6;
          d.setFont('helvetica', 'bold');
          d.text('Custo Total:', leftX, costY);
          d.text(fmt(f.custo_total), rightX, costY, { align: 'right' });

          costY += 6;
          d.text('Custo Unitario:', leftX, costY);
          d.text(fmt(f.custo_unitario), rightX, costY, { align: 'right' });

          let currentY = costY + 10;
          if (f.custos_insumos_detalhe.length > 0) {
            d.setFont('helvetica', 'bold');
            d.setFontSize(9);
            d.text('Custos Insumos:', 14, currentY);
            const insumosColSty: any = { 0: { halign: 'left' }, 1: { halign: 'right' } };
            autoTable(d, {
              head: [['Insumo', 'Valor Gasto']],
              body: f.custos_insumos_detalhe.map((c) => [c.insumo_nome, fmt(c.valor_gasto)]),
              startY: currentY + 4,
              margin: { bottom: 15 },
              theme: 'striped',
              headStyles: { fillColor: [107, 114, 128] },
              styles: { fontSize: 7 },
              columnStyles: insumosColSty,
              didParseCell(data: any) {
                if (data.section === 'head') { const cs = insumosColSty[data.column.index]; if (cs?.halign) data.cell.styles.halign = cs.halign; }
              },
            });
          }
          if (f.custos_adicionais_detalhe.length > 0) {
            const y = (d as any).lastAutoTable ? (d as any).lastAutoTable.finalY + 8 : currentY + 4;
            d.setFont('helvetica', 'bold');
            d.setFontSize(9);
            d.text('Custos Adicionais:', 14, y);
            const adicColSty: any = { 0: { halign: 'left' }, 1: { halign: 'right' } };
            autoTable(d, {
              head: [['Tipo do Custo', 'Valor Gasto']],
              body: f.custos_adicionais_detalhe.map((c) => [c.tipo_nome, fmt(c.valor)]),
              startY: y + 4,
              margin: { bottom: 15 },
              theme: 'striped',
              headStyles: { fillColor: [249, 115, 22] },
              styles: { fontSize: 7 },
              columnStyles: adicColSty,
              didParseCell(data: any) {
                if (data.section === 'head') { const cs = adicColSty[data.column.index]; if (cs?.halign) data.cell.styles.halign = cs.halign; }
              },
            });
          }
        });
      }
    );
    setPdfDoc(doc);
    setPdfFilename(filename);
    setShowConfirm(true);
  }, [data]);

  const handleView = useCallback(() => {
    if (pdfDoc) viewPDF(pdfDoc);
    setShowConfirm(false);
  }, [pdfDoc]);

  const handleCancel = useCallback(() => {
    if (pdfDoc) downloadPDF(pdfDoc, pdfFilename);
    setShowConfirm(false);
  }, [pdfDoc, pdfFilename]);

  return (
    <Layout>
      <PageHeader title="Relatorio Fabricacoes" subtitle="Relatorio de fabricacoes com custos detalhados" />

      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-background-card rounded-lg border border-border-subtle">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Data Inicio</label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
            className="input" disabled={ultimoApenas} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Data Fim</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
            className="input" disabled={ultimoApenas} />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <input type="checkbox" id="ultimoApenas" checked={ultimoApenas}
            onChange={(e) => setUltimoApenas(e.target.checked)}
            className="w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary" />
          <label htmlFor="ultimoApenas" className="text-sm text-text-secondary cursor-pointer select-none">
            Apenas ultima fabricacao de cada produto (ignora periodo)
          </label>
        </div>
        <button onClick={fetchData} className="btn-primary text-sm px-4 py-2">Filtrar</button>
        <button onClick={limparFiltros} className="btn-secondary text-sm px-4 py-2">Limpar</button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{data.length} fabricacao(oes) encontrada(s)</p>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" disabled={data.length === 0}>
          <Download size={16} /> Exportar PDF
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Erro ao carregar fabricações: {error}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-accent-primary" /></div>
      ) : (
        <div className="space-y-4">
          {data.length === 0 ? (
            <Card><div className="text-center py-8 text-text-muted">Nenhuma fabricacao encontrada</div></Card>
          ) : data.map((f) => (
            <Card key={f.id}>
              <button onClick={() => toggleExpand(f.id)} className="w-full flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {expanded.has(f.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="font-semibold text-foreground-primary">{f.produto_nome}</span>
                  <span className="text-xs text-text-muted">{new Date(f.data_fabricacao).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-text-secondary">Estoque: <strong>{fmtQtd(f.estoque_atual)}</strong></span>
                  <span className="text-text-secondary">Qtd: <strong>{fmtQtd(f.quantidade_produzida)}</strong></span>
                  <span className="text-text-secondary">Total: <strong>R$ {fmt(f.custo_total)}</strong></span>
                  <span className="text-text-secondary">Unit.: <strong>R$ {fmt(f.custo_unitario)}</strong></span>
                </div>
              </button>
              {expanded.has(f.id) && (
                <div className="border-t border-border-subtle pt-4 mt-2 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div><span className="text-text-muted">Estoque Atual:</span> <span className="font-medium">{fmtQtd(f.estoque_atual)}</span></div>
                    <div><span className="text-text-muted">Custo Insumos:</span> <span className="font-medium">R$ {fmt(f.custo_insumos)}</span></div>
                    <div><span className="text-text-muted">Custo Adicional:</span> <span className="font-medium">R$ {fmt(f.custo_adicional_total)}</span></div>
                    <div><span className="text-text-muted">Custo Total:</span> <span className="font-medium">R$ {fmt(f.custo_total)}</span></div>
                    <div><span className="text-text-muted">Custo Unitario:</span> <span className="font-medium">R$ {fmt(f.custo_unitario)}</span></div>
                  </div>
                  {f.custos_insumos_detalhe.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-secondary mb-2">Custos Insumos</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="text-left py-2 px-3 text-text-muted font-medium">Insumo</th>
                            <th className="text-right py-2 px-3 text-text-muted font-medium">Valor Gasto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.custos_insumos_detalhe.map((c, idx) => (
                            <tr key={idx} className="border-b border-border-subtle/50">
                              <td className="py-2 px-3">{c.insumo_nome}</td>
                              <td className="py-2 px-3 text-right">R$ {fmt(c.valor_gasto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {f.custos_adicionais_detalhe.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-secondary mb-2">Custos Adicionais</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="text-left py-2 px-3 text-text-muted font-medium">Tipo do Custo</th>
                            <th className="text-right py-2 px-3 text-text-muted font-medium">Valor Gasto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.custos_adicionais_detalhe.map((c, idx) => (
                            <tr key={idx} className="border-b border-border-subtle/50">
                              <td className="py-2 px-3">{c.tipo_nome}</td>
                              <td className="py-2 px-3 text-right">R$ {fmt(c.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={handleCancel}
        onConfirm={handleView}
        title="Visualizar Relatorio"
        message="Tem certeza que deseja visualizar o relatorio?"
        variant="success"
        confirmLabel="Visualizar"
      />
    </Layout>
  );
}
