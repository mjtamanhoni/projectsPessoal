const DOCUMENTO_RE = /[^0-9A-Za-z]/g;

export function normalizarDocumento(value: string): string {
  return value.replace(DOCUMENTO_RE, '').toUpperCase();
}

function valorCaractere(caractere: string): number {
  return caractere.charCodeAt(0) - 48;
}

function digitoCnpj(base: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < base.length; i += 1) {
    soma += valorCaractere(base[i]) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCnpj(value: string): boolean {
  const cnpj = normalizarDocumento(value);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  const dv1 = digitoCnpj(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = digitoCnpj(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return Number(cnpj[12]) === dv1 && Number(cnpj[13]) === dv2;
}

export function validarDocumento(value: string): boolean {
  const documento = normalizarDocumento(value);
  if (documento.length === 11) return /^[0-9]{11}$/.test(documento);
  if (documento.length === 14) return validarCnpj(documento);
  return false;
}
