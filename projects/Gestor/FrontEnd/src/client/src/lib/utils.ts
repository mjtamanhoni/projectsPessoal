export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function fotoUrl(foto: string): string {
  if (!foto) return '';
  return `/api/uploads/${foto.split('/').map(encodeURIComponent).join('/')}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr.split('T')[0] + 'T12:00:00');
  return date.toLocaleDateString('pt-BR');
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr.split('T')[0] + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function ceilTo2(value: number): number {
  return Math.ceil(value * 100) / 100;
}

export function formatCurrencyInput(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  
  const amount = parseInt(numbers, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseCurrencyInput(value: string): number {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return 0;
  return parseInt(numbers, 10) / 100;
}

export function formatQuantityInput(value: string, decimals: number = 4): string {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  const amount = parseInt(numbers, 10) / Math.pow(10, decimals);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatDecimals(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function parseQuantityInput(value: string, decimals: number = 4): number {
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return 0;
  return parseInt(numbers, 10) / Math.pow(10, decimals);
}

export interface AdicionalItemParsed {
  adicional_id?: number;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total?: number;
}

export function parseItemCustomizacao(row: { removidos?: unknown; adicionais?: unknown }): {
  removidos?: string[];
  adicionais?: AdicionalItemParsed[];
} {
  let removidos: string[] | undefined;
  if (typeof row.removidos === 'string') {
    try {
      const parsed = JSON.parse(row.removidos);
      removidos = Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      removidos = [];
    }
  }
  let adicionais: AdicionalItemParsed[] | undefined;
  if (typeof row.adicionais === 'string') {
    try {
      const parsed = JSON.parse(row.adicionais);
      adicionais = Array.isArray(parsed) ? (parsed as AdicionalItemParsed[]) : [];
    } catch {
      adicionais = [];
    }
  }
  return { removidos, adicionais };
}

export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 10) {
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  
  const limited = numbers.slice(0, 11);
  if (limited.length <= 2) return limited;
  if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

export function formatCelular(value: string): string {
  const numbers = value.replace(/\D/g, '');
  const limited = numbers.slice(0, 11);
  
  if (limited.length <= 2) return limited;
  if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

export function formatCpfCnpj(value: string): string {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 11) {
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }

  const limited = numbers.slice(0, 14);
  if (limited.length <= 2) return limited;
  if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`;
  if (limited.length <= 8) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
  if (limited.length <= 12) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
  return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12, 14)}`;
}

export interface ParcelasConfig {
  quantidade: number;
  tipoVencimento: 'fixo' | 'intervalo';
  tipoParcela: 'dividir' | 'mesmo';
  diaFixo?: number;
  intervalo?: number;
}

export function calcularParcelas(valor: number, parcelas: number): { valorParcela: number; valorDif: number } {
  if (parcelas <= 0) return { valorParcela: 0, valorDif: 0 };
  const valorParcela = Math.trunc(valor / parcelas * 100) / 100;
  let valorDif = Math.round((valor - valorParcela * parcelas) * 100) / 100;
  if (valorDif < 0) valorDif = 0;
  return { valorParcela, valorDif };
}

export function gerarParcelas(
  dataBase: string,
  valorTotal: number,
  config: ParcelasConfig
): { valor: number; dataVencimento: string }[] {
  const parcelas: { valor: number; dataVencimento: string }[] = [];
  const { valorParcela, valorDif } = calcularParcelas(valorTotal, config.quantidade);

  for (let i = 1; i <= config.quantidade; i++) {
    const d = new Date(dataBase + 'T12:00:00');

    let dataVencimento: Date;
    if (config.tipoVencimento === 'fixo') {
      d.setMonth(d.getMonth() + i);
      dataVencimento = d;
    } else {
      dataVencimento = new Date(d.getTime() + i * (config.intervalo || 30) * 86400000);
    }

    const valor = config.tipoParcela === 'dividir'
      ? (i < config.quantidade ? valorParcela : +(valorParcela + valorDif).toFixed(2))
      : valorTotal;

    parcelas.push({
      valor,
      dataVencimento: dataVencimento.toISOString().split('T')[0],
    });
  }

  return parcelas;
}
