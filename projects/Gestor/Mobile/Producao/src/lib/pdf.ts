import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export { autoTable };

export interface PDFHeaderOptions {
  title: string;
  emissionDate: string;
  filters?: string;
}

export function buildPDF(
  header: PDFHeaderOptions,
  buildFn: (doc: jsPDF, drawPageHeader?: (doc: jsPDF) => void) => void
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 14;

  const drawPageHeader = (d: jsPDF) => {
    const totalPages = d.getNumberOfPages();
    const info = d.getCurrentPageInfo();

    const titleY = 8 + 6;
    d.setFontSize(16);
    d.setFont('helvetica', 'bold');
    d.setTextColor(0);
    d.text(header.title, margin, titleY);

    const infoY = titleY + 6;
    d.setFontSize(9);
    d.setFont('helvetica', 'normal');
    d.text(`Emissão: ${header.emissionDate}`, margin, infoY);
    const pageText = `Página ${info.pageNumber} de ${totalPages}`;
    const pageTextWidth = d.getStringUnitWidth(pageText) * d.getFontSize() / d.internal.scaleFactor;
    d.text(pageText, pageWidth - margin - pageTextWidth, infoY);

    const filtersY = infoY + 5;
    d.setFontSize(8);
    d.setTextColor(80);
    d.text(header.filters ?? 'Filtros: Todos', margin, filtersY);

    const lineY = filtersY + 2.5;
    d.setDrawColor(200, 200, 200);
    d.setLineWidth(0.3);
    d.line(margin, lineY, pageWidth - margin, lineY);

    d.setDrawColor(200, 200, 200);
    d.setLineWidth(0.3);
    d.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    d.setFontSize(6);
    d.setTextColor(100);
    d.text('© 2026 - 56.134.688 MARCOS JOSE TAMANHONI', margin, pageHeight - 10.5);
    d.text('CNPJ: 56.134.688/0001-57 | ME | Data de abertura: 29/07/2024', margin, pageHeight - 6.5);
    d.text('Celular/WhatsApp: (27) 9 8833-7323 | E-mail: mjtamanhoni@gmail.com', margin, pageHeight - 2.5);

    d.setTextColor(0);
  };

  buildFn(doc, drawPageHeader);

  return doc;
}