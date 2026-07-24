import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import api from '@/lib/api';
import type { Usuario } from '@/types';
import { Download, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from '@/lib/pdf';

export function RelatorioUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof buildPDFWithHeader> | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');

  useEffect(() => {
    api.get('/usuarios')
      .then((r) => setUsuarios(r.data as Usuario[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = useCallback(() => {
    const filename = `relacao-usuarios-${new Date().toISOString().split('T')[0]}.pdf`;
    const doc = buildPDFWithHeader(
      {
        title: 'Relação de Usuários',
        emissionDate: new Date().toLocaleDateString('pt-BR'),
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        autoTable(d, {
          head: [['Nome', 'Email']],
          body: usuarios.map((u) => [
            u.nome, u.email || '-',
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
  }, [usuarios]);

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
      <PageHeader title="Relacao de Usuarios" subtitle="Listagem completa de usuarios cadastrados" />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{usuarios.length} usuario(s) encontrado(s)</p>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" disabled={usuarios.length === 0}>
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
                  <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Email</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr><td colSpan={2} className="text-center py-8 text-text-muted">Nenhum usuário encontrado</td></tr>
                ) : usuarios.map((u) => (
                  <tr key={u.id ?? u.codigo} className="border-b border-border-subtle hover:bg-bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{u.nome}</td>
                    <td className="py-3 px-4 text-sm">{u.email || '-'}</td>
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
