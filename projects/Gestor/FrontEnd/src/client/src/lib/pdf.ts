import jsPDF from 'jspdf';
import { getLogoPdf } from './settings';

interface HeaderOptions {
  title: string;
  subtitle?: string;
  emissionDate: string;
  filters?: string[];
  filtersLines?: string[][];
}

function drawHeader(doc: jsPDF, options: HeaderOptions, pageIndex: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoBase64 = getLogoPdf();
  const margin = 14;
  const headerY = 8;

  const lineHeight1 = 6;
  const lineHeight2 = 5;
  const lineHeight3 = 4;
  const totalHeaderHeight = lineHeight1 + lineHeight2 + lineHeight3;

  let logoWidth = 0;
  let logoHeight = 0;
  let logoX = margin;
  let textX = margin;

  if (logoBase64) {
    try {
      const imgProps = doc.getImageProperties(logoBase64);
      const maxWidth = 50;
      const maxHeight = totalHeaderHeight + 2;
      const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
      logoWidth = imgProps.width * ratio;
      logoHeight = imgProps.height * ratio;
      const logoY = headerY;
      const imgType = imgProps.fileType.toUpperCase() as 'PNG' | 'JPEG' | 'WEBP';
      doc.addImage(logoBase64, imgType, logoX, logoY, logoWidth, logoHeight);
      textX = logoX + logoWidth + 4;
    } catch {
    }
  }

  const titleY = headerY + lineHeight1;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(options.title, textX, titleY);

  const infoY = titleY + lineHeight2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(`Emissão: ${options.emissionDate}`, textX, infoY);

  const pageText = `Página ${pageIndex} de ${totalPages}`;
  const pageTextWidth = doc.getStringUnitWidth(pageText) * doc.getFontSize() / doc.internal.scaleFactor;
  doc.text(pageText, pageWidth - margin - pageTextWidth, infoY);

  const filtersY = infoY + lineHeight3;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);

  let lineY: number;

  if (options.filtersLines && options.filtersLines.length > 0) {
    let fY = filtersY;
    options.filtersLines.forEach((line) => {
      if (line.length >= 2) {
        doc.text(line[0], textX, fY);
        const rightTextWidth = doc.getStringUnitWidth(line[1]) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(line[1], pageWidth - margin - rightTextWidth, fY);
      } else if (line.length === 1) {
        doc.text(line[0], textX, fY);
      }
      fY += 4;
    });
    lineY = fY + 3;
  } else {
    const filtersText = options.filters && options.filters.length > 0
      ? `Filtros: ${options.filters.join(' | ')}`
      : 'Filtros: Todos';
    doc.text(filtersText, textX, filtersY);
    lineY = filtersY + 3;
  }
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  return lineY;
}

function drawFooter(doc: jsPDF, pageHeight: number) {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);

  doc.text('© 2026 - 56.134.688 MARCOS JOSE TAMANHONI', margin, pageHeight - 10.5);
  doc.text('CNPJ: 56.134.688/0001-57 | ME | Data de abertura: 29/07/2024', margin, pageHeight - 6.5);
  doc.text('Celular/WhatsApp: (27) 9 8833-7323 | E-mail: mjtamanhoni@gmail.com', margin, pageHeight - 2.5);

  doc.setTextColor(0);
}

export function buildPDF(
  buildFn: (doc: jsPDF) => void,
  options?: { orientation?: 'portrait' | 'landscape'; format?: string }
): jsPDF {
  const doc = new jsPDF({
    orientation: options?.orientation ?? 'portrait',
    unit: 'mm',
    format: options?.format ?? 'a4',
  });
  buildFn(doc);

  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.deletePage(i);
    doc.addPage();
  }

  return doc;
}

export function buildPDFWithHeader(
  headerOptions: HeaderOptions,
  buildFn: (doc: jsPDF, drawPageHeader?: (doc: jsPDF) => void) => void,
  options?: { orientation?: 'portrait' | 'landscape'; format?: string }
): jsPDF {
  const doc = new jsPDF({
    orientation: options?.orientation ?? 'portrait',
    unit: 'mm',
    format: options?.format ?? 'a4',
  });

  const pageHeight = doc.internal.pageSize.getHeight();

  const drawPageHeader = (d: jsPDF) => {
    const currentPage = d.getCurrentPageInfo().pageNumber;
    const totalPages = d.getNumberOfPages();
    d.setPage(currentPage);
    drawHeader(d, headerOptions, currentPage, totalPages);
    drawFooter(d, pageHeight);
  };

  buildFn(doc, drawPageHeader);

  return doc;
}

export function viewPDF(doc: jsPDF) {
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
