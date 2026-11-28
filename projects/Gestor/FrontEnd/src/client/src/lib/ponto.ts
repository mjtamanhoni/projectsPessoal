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

// Mascara de horas que preenche os digitos da direita para a esquerda
// (segundos -> minutos -> horas), no mesmo estilo de um campo monetario.
export function mascararHoras(valor: string): string {
  const negativo = (valor || '').trim().startsWith('-');
  const digitos = (valor || '').replace(/\D/g, '').slice(-8);
  const sinal = negativo ? '-' : '';
  if (!digitos) return sinal;

  const segundos = digitos.slice(-2);
  const resto = digitos.slice(0, -2);
  const minutos = resto.slice(-2);
  const horas = resto.slice(0, -2);

  if (horas) {
    return `${sinal}${horas}:${minutos.padStart(2, '0')}:${segundos.padStart(2, '0')}`;
  }
  if (minutos) {
    return `${sinal}${minutos}:${segundos.padStart(2, '0')}`;
  }
  return `${sinal}${segundos}`;
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

export interface FiltrosPonto {
  competencia?: string;
  ano?: number;
  mes?: number;
  usuarioId?: number;
  clienteId?: number;
  servicoId?: number;
  tipo?: string;
}

const FILTROS_PREFIX = 'ponto:filtros:';
const ULTIMO_LANCAMENTO_KEY = 'ponto:ultimo-lancamento';

export function carregarFiltrosPonto(pagina: string): FiltrosPonto {
  try {
    const salvo = localStorage.getItem(FILTROS_PREFIX + pagina);
    if (salvo) return JSON.parse(salvo) as FiltrosPonto;
  } catch { /* ignore */ }
  return {};
}

export function salvarFiltrosPonto(pagina: string, filtros: FiltrosPonto): void {
  try {
    localStorage.setItem(FILTROS_PREFIX + pagina, JSON.stringify(filtros));
  } catch { /* ignore */ }
}

export interface UltimoLancamento {
  usuarioId?: number;
  clienteId?: number;
  servicoId?: number;
}

export function carregarUltimoLancamento(): UltimoLancamento {
  try {
    const salvo = localStorage.getItem(ULTIMO_LANCAMENTO_KEY);
    if (salvo) return JSON.parse(salvo) as UltimoLancamento;
  } catch { /* ignore */ }
  return {};
}

export function salvarUltimoLancamento(dados: UltimoLancamento): void {
  try {
    localStorage.setItem(ULTIMO_LANCAMENTO_KEY, JSON.stringify(dados));
  } catch { /* ignore */ }
}

export function dataHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function horaAgora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
