import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { Download, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from '@/lib/pdf';

interface RelatorioInsumo {
  id: number;
  nome: string;
  unidade_medida: string;
  custo_medio: number;
  ultima_compra_data: string | null;
  ultima_compra_qtd: number;
  ultima_compra_valor_unitario: number;
  estoque_atual: number;
}

export function RelatorioInsumos() {
  const [data, setData] = useState<RelatorioInsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof buildPDFWithHeader> | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');

  useEffect(() => {
    api.get('/relatorios-producao/insumos')
      .then((r) => setData(r.data as RelatorioInsumo[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtQtd = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const idFmt = (v: number) => String(v);

  const handleExport = useCallback(() => {
    const filename = `relatorio-insumos-${new Date().toISOString().split('T')[0]}.pdf`;
    const doc = buildPDFWithHeader(
      {
        title: 'Relatorio de Insumos',
        emissionDate: new Date().toLocaleDateString('pt-BR'),
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        const colSty: any = {
          0: { cellWidth: 10, halign: 'right' },
          1: { halign: 'left' },
          2: { halign: 'left' },
          3: { halign: 'left' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
        };
        autoTable(d, {
          head: [['ID', 'Nome', 'Und', 'Ult. Compra', 'Qtd', 'Vr. Unit.', 'Estoque', 'Custo Medio']],
          body: data.map((i) => [
            idFmt(i.id),
            i.nome,
            i.unidade_medida,
            i.ultima_compra_data ? new Date(i.ultima_compra_data).toLocaleDateString('pt-BR') : '-',
            fmtQtd(i.ultima_compra_qtd),
            i.ultima_compra_valor_unitario ? fmt(i.ultima_compra_valor_unitario) : '-',
            fmtQtd(i.estoque_atual),
            fmt(i.custo_medio),
          ]),
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 7 },
          columnStyles: colSty,
          didParseCell(data: any) {
            if (data.section === 'head') { const cs = colSty[data.column.index]; if (cs?.halign) data.cell.styles.halign = cs.halign; }
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
      <PageHeader title="Relatorio Insumos" subtitle="Relatorio de insumos com ultima compra e estoque atual" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{data.length} insumo(s) encontrado(s)</p>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" disabled={data.length === 0}>
          <Download size={16} /> Exportar PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-accent-primary" /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-3">ID</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-3">Nome</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-3">Und</th>
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-3">Ult. Compra</th>
                  <th className="text-right text-sm font-medium text-text-secondary py-3 px-3">Qtd</th>
                  <th className="text-right text-sm font-medium text-text-secondary py-3 px-3">Vr. Unit.</th>
                  <th className="text-right text-sm font-medium text-text-secondary py-3 px-3">Estoque</th>
                  <th className="text-right text-sm font-medium text-text-secondary py-3 px-3">Custo Medio</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-text-muted">Nenhum insumo encontrado</td></tr>
                ) : data.map((i) => (
                  <tr key={i.id} className="border-b border-border-subtle hover:bg-bg-muted/50 transition-colors">
                    <td className="py-3 px-3 text-sm text-text-muted">{i.id}</td>
                    <td className="py-3 px-3 text-sm font-medium">{i.nome}</td>
                    <td className="py-3 px-3 text-sm">{i.unidade_medida}</td>
                    <td className="py-3 px-3 text-sm">{i.ultima_compra_data ? new Date(i.ultima_compra_data).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="py-3 px-3 text-sm text-right">{fmtQtd(i.ultima_compra_qtd)}</td>
                    <td className="py-3 px-3 text-sm text-right">{i.ultima_compra_valor_unitario ? fmt(i.ultima_compra_valor_unitario) : '-'}</td>
                    <td className="py-3 px-3 text-sm text-right">{fmtQtd(i.estoque_atual)}</td>
                    <td className="py-3 px-3 text-sm text-right">{fmt(i.custo_medio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
