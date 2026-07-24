import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import api from '@/lib/api';
import type { Formulario } from '@/types';
import { Download, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from '@/lib/pdf';

export function RelatorioFormularios() {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof buildPDFWithHeader> | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');

  useEffect(() => {
    api.get('/formularios')
      .then((r) => setFormularios(r.data as Formulario[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = useCallback(() => {
    const filename = `relacao-formularios-${new Date().toISOString().split('T')[0]}.pdf`;
    const doc = buildPDFWithHeader(
      {
        title: 'Relação de Formulários',
        emissionDate: new Date().toLocaleDateString('pt-BR'),
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        autoTable(d, {
          head: [['Nome']],
          body: formularios.map((f) => [
            f.nome,
          ]),
          startY: 42,
          margin: { bottom: 15 },
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 8 },
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
  }, [formularios]);

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
      <PageHeader title="Relacao de Formularios" subtitle="Listagem completa de formularios cadastrados" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{formularios.length} formulario(s) encontrado(s)</p>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" disabled={formularios.length === 0}>
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
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Nome</th>
                </tr>
              </thead>
              <tbody>
                {formularios.length === 0 ? (
                  <tr><td colSpan={1} className="text-center py-8 text-text-muted">Nenhum formulário encontrado</td></tr>
                ) : formularios.map((f) => (
                  <tr key={f.id ?? f.codigo} className="border-b border-border-subtle hover:bg-bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{f.nome}</td>
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
        title="Visualizar Relatório"
        message="Tem certeza que deseja visualizar o relatório?"
        variant="success"
        confirmLabel="Visualizar"
      />
    </Layout>
  );
}
