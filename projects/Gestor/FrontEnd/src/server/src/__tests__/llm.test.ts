import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { gerarRelatorioIA, traduzirErroLLM } from '../services/llm';
import { AppError } from '../types';

function erroHttp(status: number, data: unknown) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data },
  };
}

describe('traduzirErroLLM', () => {
  it('converte 401 do provedor em 502 para nao encerrar a sessao do usuario', () => {
    const erro = traduzirErroLLM(erroHttp(401, { error: { message: 'API key not valid' } }));

    expect(erro).toBeInstanceOf(AppError);
    expect(erro.status).toBe(502);
    expect(erro.message).toContain('autenticacao');
    expect(erro.message).toContain('API key not valid');
  });

  it('converte 403 do provedor em 502', () => {
    const erro = traduzirErroLLM(erroHttp(403, { error: { message: 'Forbidden' } }));

    expect(erro.status).toBe(502);
    expect(erro.message).toContain('Forbidden');
  });

  it('mantem 429 do provedor como 429', () => {
    const erro = traduzirErroLLM(erroHttp(429, { error: { message: 'Rate limit exceeded' } }));

    expect(erro.status).toBe(429);
    expect(erro.message).toContain('limite de uso');
  });

  it('converte falha de rede ou timeout em 504', () => {
    const erro = traduzirErroLLM({ isAxiosError: true, message: 'timeout of 45000ms exceeded' });

    expect(erro.status).toBe(504);
  });

  it('converte erro HTTP generico do provedor em 502', () => {
    const erro = traduzirErroLLM(erroHttp(500, { error: { message: 'internal error' } }));

    expect(erro.status).toBe(502);
    expect(erro.message).toContain('500');
  });

  it('preserva AppError ja tratado', () => {
    const original = new AppError('IA nao configurada', 503);

    expect(traduzirErroLLM(original)).toBe(original);
  });

  it('converte erro desconhecido em 502', () => {
    expect(traduzirErroLLM(new Error('boom')).status).toBe(502);
  });

  it('limita o tamanho do detalhe devolvido pelo provedor', () => {
    const enorme = 'x'.repeat(500);
    const erro = traduzirErroLLM(erroHttp(400, { error: { message: enorme } }));

    expect(erro.status).toBe(502);
    expect(erro.message.length).toBeLessThan(enorme.length);
    expect(erro.message).toContain('...');
  });

  it('gerarRelatorioIA nao propaga 401 do provedor para o cliente', async () => {
    const spy = vi
      .spyOn(axios, 'post')
      .mockRejectedValueOnce(erroHttp(401, { error: { message: 'invalid key' } }));

    try {
      await expect(
        gerarRelatorioIA({
          historico: [{ papel: 'usuario', conteudo: 'oi' }],
          executarConsulta: async () => ({ colunas: [], linhas: [], sql: '', total_linhas: 0 }),
          llm: { apiKey: 'teste', baseUrl: 'http://localhost:1/v1', model: 'modelo' },
        }),
      ).rejects.toMatchObject({ status: 502 });
    } finally {
      spy.mockRestore();
    }
  });
});
