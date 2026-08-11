import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type jsPDF from 'jspdf';

export async function compartilharPDF(doc: jsPDF, filename: string, titulo: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    doc.save(filename);
    return;
  }

  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] ?? '';

  const escrito = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });

  await Share.share({
    title: titulo,
    text: `${titulo}\nArquivo: ${filename}`,
    files: [escrito.uri],
    dialogTitle: 'Compartilhar ou abrir o PDF em apps instalados',
  });
}

export function nomeArquivo(base: string): string {
  return `${base}-${new Date().toISOString().split('T')[0]}.pdf`;
}

export function sanitizeNome(nome: string): string {
  return nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}