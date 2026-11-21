export function formatHoras(valor: number): string {
  const total = Math.round(Math.abs(valor || 0) * 3600);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function parseHorasTexto(valor: string): number {
  const partes = (valor || '').split(':').map((p) => Number(p));
  if (partes.length < 2 || partes.some((p) => Number.isNaN(p))) return 0;
  const [h, m, s = 0] = partes;
  return h + m / 60 + s / 3600;
}

export function competenciaAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function competenciaAtualAno(): number {
  return new Date().getFullYear();
}

export function competenciaAtualMes(): number {
  return new Date().getMonth() + 1;
}

export function labelMes(mes: number): string {
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return nomes[mes - 1] || '';
}

export function exportarCsv(
  nomeArquivo: string,
  cabecalho: string[],
  linhas: Array<Array<string | number>>,
): void {
  const escapar = (valor: string | number): string => {
    const s = String(valor ?? '');
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escapar).join(';'))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${conteudo}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
