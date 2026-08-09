import jsPDF from 'jspdf';
import { gerarTextoCupom, type CupomData } from './cupom';

export function gerarPDFCupom(data: CupomData): jsPDF {
  const texto = gerarTextoCupom(data);
  const linhas = texto.split('\n');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 297] });
  const pageWidth = 80;
  const margin = 3;
  const cols = 48;
  const rightEdge = pageWidth - margin;
  const usableWidth = rightEdge - margin;
  const charWidth = usableWidth / cols;
  const fontSize = charWidth / (0.6 * (25.4 / 72));
  let y = margin;

  doc.setFont('courier', 'normal');
  doc.setFontSize(fontSize);

  linhas.forEach((linha) => {
    if (y > 280) {
      doc.addPage([80, 297]);
      y = margin;
    }

    const ehSepDupla = linha.startsWith('=');
    const ehSepSimples = !linha.includes('CORTE') && linha.startsWith('-');
    if (ehSepDupla || ehSepSimples) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(ehSepDupla ? 0.2 : 0.1);
      doc.line(margin, y - 1, rightEdge, y - 1);
    } else if (linha.includes('CORTE AQUI')) {
      doc.setFontSize(fontSize * 0.85);
      doc.text(linha, margin, y);
      doc.setFontSize(fontSize);
    } else {
      doc.text(linha, margin, y);
    }
    y += 4;
  });

  if (data.pixQrBase64) {
    y += 2;
    if (y + 40 > 280) {
      doc.addPage([80, 297]);
      y = margin;
    }
    const qrSize = 38;
    const qrX = (pageWidth - qrSize) / 2;
    try {
      doc.addImage(data.pixQrBase64, 'PNG', qrX, y, qrSize, qrSize);
      y += qrSize + 3;
      doc.setFontSize(fontSize);
      doc.text('PAGUE COM PIX', (pageWidth - doc.getTextWidth('PAGUE COM PIX')) / 2, y);
    } catch {
      /* QR indisponivel no PDF */
    }
  }

  return doc;
}