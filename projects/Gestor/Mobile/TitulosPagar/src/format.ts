const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const onlyDate = value.slice(0, 10);
  const parts = onlyDate.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
}

export function hojeISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function adicionarMeses(dataISO: string, meses: number): string {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  if (!ano || !mes || !dia) return dataISO;
  const alvo = new Date(ano, mes - 1 + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  const diaFinal = Math.min(dia, ultimoDia);
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
}

export function daquiA30DiasISO(): string {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function isOverdue(dataVencimento?: string | null): boolean {
  if (!dataVencimento) return false;
  const venc = dataVencimento.slice(0, 10);
  return venc < hojeISO();
}

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function mesAnoLabel(value?: string | null): string {
  if (!value) return 'Sem data';
  const [ano, mes] = value.slice(0, 7).split('-');
  const indice = Number(mes) - 1;
  if (!ano || Number.isNaN(indice) || !MESES[indice]) return 'Sem data';
  return `${MESES[indice]}/${ano}`;
}

export function mascaraMoeda(valor: string, casas = 2): string {
  const digitos = valor.replace(/\D/g, '');
  if (digitos === '') return '';
  const intLen = Math.max(digitos.length - casas, 0);
  const intPart = (digitos.slice(0, intLen) || '0')
    .replace(/^0+(?=\d)/, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = digitos.slice(intLen).padStart(casas, '0');
  return `${intPart},${decPart}`;
}

export function parseMoney(value: string): number {
  const limpo = value.replace(/[^\d,.-]/g, '');
  if (!limpo) return 0;

  if (limpo.includes(',')) {
    const n = Number(limpo.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  const pontos = (limpo.match(/\./g) || []).length;
  if (pontos > 1) {
    const n = Number(limpo.replace(/\./g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  if (pontos === 1) {
    const [inteiro, decimal] = limpo.split('.');
    if (inteiro !== '0' && decimal.length === 3) {
      const n = Number(inteiro + decimal);
      return Number.isFinite(n) ? n : 0;
    }
  }

  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function moneyInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value.toFixed(2).replace('.', ',');
}

export function dividirValor(valor: number, parcelas: number): number[] {
  if (!Number.isFinite(valor) || parcelas <= 0) return [];
  const centavos = Math.round(valor * 100);
  const base = Math.floor(centavos / parcelas);
  const resto = centavos - base * parcelas;
  return Array.from({ length: parcelas }, (_, indice) =>
    (base + (indice === parcelas - 1 ? resto : 0)) / 100
  );
}

export function mascaraCpfCnpj(value: string): string {
  const chars = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const temLetra = /[A-Z]/.test(chars);
  if (!temLetra && chars.length <= 11) {
    if (chars.length <= 3) return chars;
    if (chars.length <= 6) return `${chars.slice(0, 3)}.${chars.slice(3)}`;
    if (chars.length <= 9) return `${chars.slice(0, 3)}.${chars.slice(3, 6)}.${chars.slice(6)}`;
    return `${chars.slice(0, 3)}.${chars.slice(3, 6)}.${chars.slice(6, 9)}-${chars.slice(9, 11)}`;
  }
  const limited = chars.slice(0, 14);
  if (limited.length <= 2) return limited;
  if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`;
  if (limited.length <= 8) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
  if (limited.length <= 12) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
  return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12, 14)}`;
}

export interface StatusInfo {
  label: string;
  tone: 'pendente' | 'parcial' | 'pago' | 'atrasado' | 'cancelado';
}

export function statusDoTitulo(titulo: { status?: string; data_vencimento?: string }): StatusInfo {
  const status = (titulo.status || '').toUpperCase();
  if (status === 'QUITADO') return { label: 'Baixado', tone: 'pago' };
  if (status === 'PARCIAL') return { label: 'Parcial', tone: 'parcial' };
  if (status === 'CANCELADO') return { label: 'Cancelado', tone: 'cancelado' };
  if (isOverdue(titulo.data_vencimento)) return { label: 'Atrasado', tone: 'atrasado' };
  return { label: 'Pendente', tone: 'pendente' };
}
