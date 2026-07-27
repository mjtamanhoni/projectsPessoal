import jsPDF from 'jspdf';
import { gerarTextoCupom, CupomData } from './cupom';

export function gerarPDFCupom(data: CupomData): jsPDF {
  const texto = gerarTextoCupom(data);
  const linhas = texto.split('\n');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 297] });
  const pageWidth = 80;
  const margin = 3;
  let y = margin;

  doc.setFontSize(8);
  doc.setFont('courier', 'normal');

  linhas.forEach((linha) => {
    if (y > 280) {
      doc.addPage([80, 297]);
      y = margin;
    }

    const ehSep = linha.startsWith('=');
    const ehSepL = linha.startsWith('-');

    if (ehSep || ehSepL) {
      doc.setFontSize(6);
      doc.text(linha, margin, y);
      doc.setFontSize(8);
    } else if (linha.includes('CORTE AQUI')) {
      doc.setFontSize(6);
      doc.text(linha, margin, y);
      doc.setFontSize(8);
    } else {
      doc.text(linha, margin, y);
    }
    y += 4;
  });

  return doc;
}
