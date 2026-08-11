export type FiltroStatus = '1' | '2' | '3' | '4' | '5' | '6' | '0' | 'todos';
export type FiltroStatusAtivo = '1' | '0' | 'todos';

export interface FiltroPeriodo {
  inicio: string;
  fim: string;
}

export function mesCorrente(): FiltroPeriodo {
  const agora = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    inicio: iso(new Date(agora.getFullYear(), agora.getMonth(), 1)),
    fim: iso(new Date(agora.getFullYear(), agora.getMonth() + 1, 0)),
  };
}

export function normalizarTexto(valor: unknown): string {
  return String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function passaBusca(valores: (string | number | undefined | null)[], busca: string): boolean {
  const b = normalizarTexto(busca).trim();
  if (!b) return true;
  return valores.some((v) => normalizarTexto(v).includes(b));
}

export function passaStatusAtivo(ativo: boolean | undefined | null, filtro: FiltroStatusAtivo): boolean {
  if (filtro === 'todos') return true;
  return (ativo ?? true) === (filtro === '1');
}

export function passaStatusNumero(status: number | undefined | null, filtro: FiltroStatus): boolean {
  if (filtro === 'todos') return true;
  return String(status ?? 1) === filtro;
}

export function passaPeriodo(data: string | undefined | null, periodo?: FiltroPeriodo): boolean {
  if (!periodo || (!periodo.inicio && !periodo.fim)) return true;
  if (!data) return false;
  const d = data.slice(0, 10);
  if (periodo.inicio && d < periodo.inicio) return false;
  if (periodo.fim && d > periodo.fim) return false;
  return true;
}