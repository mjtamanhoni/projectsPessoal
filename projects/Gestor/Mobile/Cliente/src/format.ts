export function mascaraMoeda(valor: string, casas: number): string {
  const digitos = valor.replace(/\D/g, '');
  if (digitos === '') return '';
  const intLen = Math.max(digitos.length - casas, 0);
  const intPart = (digitos.slice(0, intLen) || '0')
    .replace(/^0+(?=\d)/, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = digitos.slice(intLen).padStart(casas, '0');
  return `${intPart},${decPart}`;
}

export function decimalParaNumero(valor: string): number | undefined {
  const s = valor.trim();
  if (s === '') return undefined;
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

export function numeroParaDecimal(v: number | undefined | null, casas: number): string {
  if (v == null || !Number.isFinite(v)) return '';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function mascaraNumero(valor: string, casas: number): string {
  let s = valor.replace(/[^\d,]/g, '');
  const vIdx = s.indexOf(',');
  if (vIdx >= 0) {
    const int = s.slice(0, vIdx).replace(/\D/g, '');
    const dec = s.slice(vIdx + 1).replace(/\D/g, '').slice(0, casas);
    return dec.length > 0 ? `${int},${dec}` : `${int},`;
  }
  return s.replace(/\D/g, '');
}

export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCpfCnpj(valor: string): string {
  const numbers = valor.replace(/\D/g, '').slice(0, 14);
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

export function emailValido(email: string): boolean {
  if (email.trim() === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function formatarMoeda(v: number | string | null | undefined): string {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarData(data: string): string {
  const d = data.replace(/\D/g, '');
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
}

export function dataHojeISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function formatarDataBR(iso: string): string {
  const v = (iso ?? '').split('T')[0];
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return v;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
