import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import type { Categoria } from '@/types';
import { Download, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import autoTable from 'jspdf-autotable';
import { buildPDFWithHeader, viewPDF, downloadPDF } from '@/lib/pdf';
import { useSearchParams } from 'react-router-dom';

type Tab = 'escolha' | 'receber' | 'pagar';

export function RelatorioCategorias() {
  const [tab, setTab] = useState<Tab>('escolha');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<'receber' | 'pagar'>('receber');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<ReturnType<typeof buildPDFWithHeader> | null>(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('tipo');
    if (t === 'receber' || t === 'pagar') {
      setTipo(t);
      setTab(t);
    }
  }, [searchParams]);

  useEffect(() => {
    if (tab === 'escolha') return;
    setLoading(true);
    const endpoint = tab === 'receber' ? '/categorias/receber' : '/categorias/pagar';
    api.get(endpoint)
      .then((r) => setCategorias(r.data as Categoria[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  const handleExport = useCallback(() => {
    const title = `Relação de Categorias - ${tab === 'receber' ? 'Receber' : 'Pagar'}`;
    const filename = `relacao-categorias-${tab}-${new Date().toISOString().split('T')[0]}.pdf`;
    const doc = buildPDFWithHeader(
      {
        title,
        emissionDate: new Date().toLocaleDateString('pt-BR'),
      },
      (d, drawPageHeader) => {
        if (drawPageHeader) drawPageHeader(d);
        autoTable(d, {
          head: [['Nome', 'Descrição']],
          body: categorias.map((c) => [c.nome, c.descricao || '-']),
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
  }, [categorias, tab]);

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
      <PageHeader title="Relacao de Categorias" subtitle="Listagem completa de categorias cadastradas" />

      {tab === 'escolha' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-12">
          <button
            onClick={() => { setTipo('receber'); setTab('receber'); }}
            className="p-8 bg-white rounded-2xl border-2 border-border-subtle hover:border-accent-primary hover:shadow-lg transition-all text-center group"
          >
            <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-primary/10 transition-colors">
              <svg className="w-8 h-8 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Categorias de Recebimento</h3>
            <p className="text-sm text-text-muted mt-2">Visualizar categorias de contas a receber</p>
          </button>

          <button
            onClick={() => { setTipo('pagar'); setTab('pagar'); }}
            className="p-8 bg-white rounded-2xl border-2 border-border-subtle hover:border-accent-red hover:shadow-lg transition-all text-center group"
          >
            <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-red/10 transition-colors">
              <svg className="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Categorias de Pagamento</h3>
            <p className="text-sm text-text-muted mt-2">Visualizar categorias de contas a pagar</p>
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setTab('escolha')}
                className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-background-hover transition-colors"
              >
                &larr; Voltar
              </button>
              <span className="text-sm text-text-secondary">{categorias.length} categoria(s) encontrada(s)</span>
            </div>
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" disabled={categorias.length === 0}>
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
                      <th className="text-left text-sm font-medium text-text-secondary py-3 px-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.length === 0 ? (
                      <tr><td colSpan={2} className="text-center py-8 text-text-muted">Nenhuma categoria encontrada</td></tr>
                    ) : categorias.map((c) => (
                      <tr key={c.id ?? c.codigo} className="border-b border-border-subtle hover:bg-bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-sm font-medium">{c.nome}</td>
                        <td className="py-3 px-4 text-sm">{c.descricao || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
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
