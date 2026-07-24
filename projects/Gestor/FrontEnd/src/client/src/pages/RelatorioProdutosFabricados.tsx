import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import { Download, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from '@/lib/pdf';

interface Ingrediente {
  insumo_id: number;
  insumo_nome: string;
  unidade_medida: string;
  quantidade: number;
  custo_medio: number;
  valor_gasto: number;
}

interface RelatorioProduto {
  id: number;
  nome: string;
  unidade_medida: string;
  custo_unitario: number;
  valor_venda_sugerido: number;
  ultima_venda_data: string | null;
  ultima_venda_qtd: number;
  ultima_venda_preco: number;
  estoque_atual: number;
  ingredientes: Ingrediente[];
}

export function RelatorioProdutosFabricados() {
  const [data, setData] = useState<RelatorioProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof buildPDFWithHeader> | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');

  useEffect(() => {
    api.get('/relatorios-producao/produtos-fabricados')
      .then((r) => setData(r.data as RelatorioProduto[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtQtd = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  const handleExport = useCallback(() => {
    const filename = `relatorio-produtos-fabricados-${new Date().toISOString().split('T')[0]}.pdf`;
    const doc = buildPDFWithHeader(
      {
        title: 'Relatorio de Produtos Fabricados',
        emissionDate: new Date().toLocaleDateString('pt-BR'),
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        data.forEach((p, idx) => {
          if (idx > 0) {
            d.addPage();
            if (drawPageHeader) drawPageHeader(d);
          }
          d.setFontSize(10);
          d.setFont('helvetica', 'bold');
          d.text(`${p.nome} (ID: ${p.id})`, 14, 42);
          const prodColSty: any = {
            0: { halign: 'left' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'left' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
          };
          autoTable(d, {
            head: [['Und', 'Custo Unit.', 'Vlr. Venda Sug.', 'Ult. Venda', 'Qtd Ult. Venda', 'Preco Venda', 'Estoque Atual']],
            body: [[
              p.unidade_medida,
              fmt(p.custo_unitario),
              fmt(p.valor_venda_sugerido),
              p.ultima_venda_data ? new Date(p.ultima_venda_data).toLocaleDateString('pt-BR') : '-',
              fmtQtd(p.ultima_venda_qtd),
              fmt(p.ultima_venda_preco),
              fmtQtd(p.estoque_atual),
            ]],
            startY: 46,
            margin: { bottom: 15 },
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 8 },
            columnStyles: prodColSty,
            didParseCell(data: any) {
              if (data.section === 'head') { const cs = prodColSty[data.column.index]; if (cs?.halign) data.cell.styles.halign = cs.halign; }
            },
          });
          if (p.ingredientes.length > 0) {
            const y = (d as any).lastAutoTable.finalY + 8;
            d.setFontSize(9);
            d.setFont('helvetica', 'bold');
            d.text('Ingredientes:', 14, y);
            const ingColSty: any = {
              0: { halign: 'left' },
              1: { halign: 'left' },
              2: { halign: 'right' },
              3: { halign: 'right' },
              4: { halign: 'right' },
            };
            autoTable(d, {
              head: [['Insumo', 'Un', 'Quantidade', 'Custo Medio', 'Valor Gasto']],
              body: p.ingredientes.map((ing) => [
                ing.insumo_nome,
                ing.unidade_medida,
                fmtQtd(ing.quantidade),
                fmt(ing.custo_medio),
                fmt(ing.valor_gasto),
              ]),
              startY: y + 4,
              margin: { bottom: 15 },
              theme: 'striped',
              headStyles: { fillColor: [107, 114, 128] },
              styles: { fontSize: 7 },
              columnStyles: ingColSty,
              didParseCell(data: any) {
                if (data.section === 'head') { const cs = ingColSty[data.column.index]; if (cs?.halign) data.cell.styles.halign = cs.halign; }
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
      <PageHeader title="Relatorio Produtos Fabricados" subtitle="Relatorio de produtos fabricados com ingredientes e estoque" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{data.length} produto(s) encontrado(s)</p>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" disabled={data.length === 0}>
          <Download size={16} /> Exportar PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-accent-primary" /></div>
      ) : (
        <div className="space-y-4">
          {data.length === 0 ? (
            <Card><div className="text-center py-8 text-text-muted">Nenhum produto encontrado</div></Card>
          ) : data.map((p) => (
            <Card key={p.id}>
              <button onClick={() => toggleExpand(p.id)} className="w-full flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {expanded.has(p.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="font-semibold text-foreground-primary">{p.nome}</span>
                  <span className="text-xs text-text-muted">ID: {p.id}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-text-secondary">Estoque: <strong>{fmtQtd(p.estoque_atual)}</strong></span>
                  <span className="text-text-secondary">Custo Unit.: <strong>R$ {fmt(p.custo_unitario)}</strong></span>
                </div>
              </button>
              {expanded.has(p.id) && (
                <div className="border-t border-border-subtle pt-4 mt-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div><span className="text-text-muted">Unidade:</span> <span className="font-medium">{p.unidade_medida}</span></div>
                    <div><span className="text-text-muted">Vlr. Venda Sugerido:</span> <span className="font-medium">R$ {fmt(p.valor_venda_sugerido)}</span></div>
                    <div><span className="text-text-muted">Ultima Venda:</span> <span className="font-medium">{p.ultima_venda_data ? new Date(p.ultima_venda_data).toLocaleDateString('pt-BR') : '-'}</span></div>
                    <div><span className="text-text-muted">Preco Ult. Venda:</span> <span className="font-medium">R$ {fmt(p.ultima_venda_preco)}</span></div>
                  </div>
                  {p.ingredientes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-secondary mb-2">Ingredientes</h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="text-left py-2 px-3 text-text-muted font-medium">Insumo</th>
                            <th className="text-left py-2 px-3 text-text-muted font-medium">Un</th>
                            <th className="text-right py-2 px-3 text-text-muted font-medium">Quantidade</th>
                            <th className="text-right py-2 px-3 text-text-muted font-medium">Custo Medio</th>
                            <th className="text-right py-2 px-3 text-text-muted font-medium">Valor Gasto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.ingredientes.map((ing, idx) => (
                            <tr key={idx} className="border-b border-border-subtle/50">
                              <td className="py-2 px-3">{ing.insumo_nome}</td>
                              <td className="py-2 px-3">{ing.unidade_medida}</td>
                              <td className="py-2 px-3 text-right">{fmtQtd(ing.quantidade)}</td>
                              <td className="py-2 px-3 text-right">R$ {fmt(ing.custo_medio)}</td>
                              <td className="py-2 px-3 text-right">R$ {fmt(ing.valor_gasto)}</td>
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
