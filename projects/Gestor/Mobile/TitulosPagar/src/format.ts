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

export function mascaraCpfCnpj(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  if (numbers.length <= 13) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
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
