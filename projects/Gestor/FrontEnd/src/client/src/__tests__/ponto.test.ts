import { describe, it, expect } from 'vitest';
import { formatHoras, mascararHoras, parseHorasTexto } from '@/lib/ponto';

describe('mascararHoras', () => {
  it('preenche os digitos da direita para a esquerda', () => {
    expect(mascararHoras('0')).toBe('0');
    expect(mascararHoras('01')).toBe('01');
    expect(mascararHoras('010')).toBe('0:10');
    expect(mascararHoras('0100')).toBe('01:00');
    expect(mascararHoras('01000')).toBe('0:10:00');
    expect(mascararHoras('010000')).toBe('01:00:00');
    expect(mascararHoras('010009')).toBe('01:00:09');
  });

  it('ignora caracteres que nao sao digitos', () => {
    expect(mascararHoras('01:00:09')).toBe('01:00:09');
    expect(mascararHoras('01a00b09')).toBe('01:00:09');
  });

  it('mantem o sinal negativo', () => {
    expect(mascararHoras('-010009')).toBe('-01:00:09');
    expect(mascararHoras('-')).toBe('-');
  });
});

describe('parseHorasTexto', () => {
  it('converte horas, minutos e segundos em horas decimais', () => {
    expect(parseHorasTexto('01:00:09')).toBeCloseTo(1.0025, 6);
    expect(parseHorasTexto('33:45:15')).toBeCloseTo(33.7541666, 6);
  });
});

describe('formatHoras', () => {
  it('preserva os segundos ao formatar', () => {
    expect(formatHoras(1.0025)).toBe('01:00:09');
  });
});
