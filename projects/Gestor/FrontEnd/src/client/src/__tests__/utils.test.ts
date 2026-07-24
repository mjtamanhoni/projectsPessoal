import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, isOverdue, cn } from '@/lib/utils';

describe('formatCurrency', () => {
  it('deve formatar valor em moeda BRL', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1.234');
    expect(result).toContain('56');
  });

  it('deve formatar zero', () => {
    expect(formatCurrency(0)).toContain('0,00');
  });
});

describe('formatDate', () => {
  it('deve formatar data ISO para pt-BR', () => {
    const result = formatDate('2024-12-25T12:00:00');
    expect(result).toBe('25/12/2024');
  });

  it('deve retornar "-" para data vazia', () => {
    expect(formatDate('')).toBe('-');
  });
});

describe('isOverdue', () => {
  it('deve retornar true para data passada', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('deve retornar false para data futura', () => {
    expect(isOverdue('2099-12-31')).toBe(false);
  });
});

describe('cn', () => {
  it('deve concatenar classes válidas', () => {
    expect(cn('foo', 'bar', null, false, undefined, 'baz')).toBe('foo bar baz');
  });
});
