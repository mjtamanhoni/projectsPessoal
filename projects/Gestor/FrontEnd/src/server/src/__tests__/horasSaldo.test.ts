import { describe, expect, it } from 'vitest';

import type { HoraAbatida, HoraExcedida, HoraTrabalhada, Servico } from '../types';
import {
  recalcularSaldoAcumulado,
  referenciasDeAbatidas,
  referenciasDeTrabalhos,
  type HorasSaldoApi,
} from '../services/horasSaldo';

const USUARIO = 1;
const CLIENTE = 2;
const SERVICO = 3;

interface DadosFake {
  trabalhos: HoraTrabalhada[];
  abatidas: HoraAbatida[];
  excedidas: HoraExcedida[];
  servicos: Servico[];
}

interface ApiFake extends HorasSaldoApi {
  salvos: HoraExcedida[][];
}

function data(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function numeroDoParametro(params: Record<string, unknown> | undefined, chave: string): number | null {
  const valor = params?.[chave];
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function dentroDoPeriodo(dataValor: string, params: Record<string, unknown> | undefined): boolean {
  const inicial = params?.data_inicial;
  const final = params?.data_final;
  const dia = String(dataValor).split('T')[0];
  if (typeof inicial === 'string' && inicial && dia < inicial) return false;
  if (typeof final === 'string' && final && dia > final) return false;
  return true;
}

function criarApiFake(dados: DadosFake): ApiFake {
  const salvos: HoraExcedida[][] = [];
  return {
    salvos,
    async listarHorasTrabalhadas(params) {
      return dados.trabalhos.filter((item) => {
        const id = numeroDoParametro(params, 'id');
        if (id !== null && item.id !== id) return false;
        const usuarioId = numeroDoParametro(params, 'usuario_id');
        if (usuarioId !== null && item.usuarioId !== usuarioId) return false;
        const clienteId = numeroDoParametro(params, 'cliente_id');
        if (clienteId !== null && item.clienteId !== clienteId) return false;
        const servicoId = numeroDoParametro(params, 'servico_id');
        if (servicoId !== null && item.servicoId !== servicoId) return false;
        return dentroDoPeriodo(item.dataServico, params);
      });
    },
    async listarHorasAbatidas(params) {
      return dados.abatidas.filter((item) => {
        const id = numeroDoParametro(params, 'id');
        if (id !== null && item.id !== id) return false;
        const usuarioId = numeroDoParametro(params, 'usuario_id');
        if (usuarioId !== null && item.usuarioId !== usuarioId) return false;
        return dentroDoPeriodo(item.dataAbatimento, params);
      });
    },
    async listarHorasExcedidas(params) {
      return dados.excedidas.filter((item) => {
        const id = numeroDoParametro(params, 'id');
        if (id !== null && item.id !== id) return false;
        const usuarioId = numeroDoParametro(params, 'usuario_id');
        if (usuarioId !== null && item.usuarioId !== usuarioId) return false;
        const clienteId = numeroDoParametro(params, 'cliente_id');
        if (clienteId !== null && item.clienteId !== clienteId) return false;
        const servicoId = numeroDoParametro(params, 'servico_id');
        if (servicoId !== null && item.servicoId !== servicoId) return false;
        const anoOrigem = numeroDoParametro(params, 'ano_origem');
        if (anoOrigem !== null && item.anoOrigem !== anoOrigem) return false;
        const mesOrigem = numeroDoParametro(params, 'mes_origem');
        if (mesOrigem !== null && item.mesOrigem !== mesOrigem) return false;
        return true;
      });
    },
    async listarServicos() {
      return dados.servicos;
    },
    async salvarHorasExcedidas(horas) {
      salvos.push(horas.map((hora) => ({ ...hora })));
      return {};
    },
  };
}

function trabalho(
  ano: number,
  mes: number,
  dia: number,
  quantidadeHoras: number,
  overrides: Partial<HoraTrabalhada> = {},
): HoraTrabalhada {
  return {
    id: 0,
    usuarioId: USUARIO,
    clienteId: CLIENTE,
    servicoId: SERVICO,
    valorHora: 10,
    dataServico: data(ano, mes, dia),
    horaInicio: '08:00',
    horaTermino: '18:00',
    quantidadeHoras,
    ...overrides,
  };
}

function abatida(
  ano: number,
  mes: number,
  quantidadeHoras: number,
  overrides: Partial<HoraAbatida> = {},
): HoraAbatida {
  return {
    id: 0,
    usuarioId: USUARIO,
    clienteId: CLIENTE,
    servicoId: SERVICO,
    dataAbatimento: data(ano, mes, 10),
    valor: quantidadeHoras * 10,
    valorHora: 10,
    quantidadeHoras,
    ...overrides,
  };
}

function excedida(ano: number, mes: number, deltaHoras: number, id: number): HoraExcedida {
  return {
    id,
    usuarioId: USUARIO,
    clienteId: CLIENTE,
    servicoId: SERVICO,
    mesOrigem: mes,
    anoOrigem: ano,
    deltaHoras,
  };
}

function servico(horasMinimas = '00:00:00', id = SERVICO): Servico {
  return { id, nome: 'Servico', valorHora: 10, horasMinimas };
}

describe('recalcularSaldoAcumulado', () => {
  it('recalcula os meses seguintes ao editar um lancamento', async () => {
    const api = criarApiFake({
      servicos: [servico()],
      trabalhos: [
        trabalho(2026, 6, 10, 20),
        trabalho(2026, 7, 10, 10),
        trabalho(2026, 8, 10, 10),
        trabalho(2026, 9, 10, 10),
        trabalho(2026, 10, 10, 10),
      ],
      abatidas: [],
      excedidas: [
        excedida(2026, 5, 0, 1),
        excedida(2026, 6, 10, 2),
        excedida(2026, 7, 20, 3),
        excedida(2026, 8, 30, 4),
        excedida(2026, 9, 40, 5),
        excedida(2026, 10, 50, 6),
      ],
    });

    const total = await recalcularSaldoAcumulado(
      [{ usuarioId: USUARIO, clienteId: CLIENTE, servicoId: SERVICO, ano: 2026, mes: 6 }],
      { agora: new Date(2026, 10, 15), api },
    );

    expect(total).toBe(5);
    expect(api.salvos).toHaveLength(1);
    expect(api.salvos[0].map((item) => [item.anoOrigem, item.mesOrigem, item.deltaHoras, item.id])).toEqual([
      [2026, 6, 20, 2],
      [2026, 7, 30, 3],
      [2026, 8, 40, 4],
      [2026, 9, 50, 5],
      [2026, 10, 60, 6],
    ]);
  });

  it('cria o fechamento do mes anterior quando o primeiro lancamento e do mes atual', async () => {
    const api = criarApiFake({
      servicos: [servico('01:00:00')],
      trabalhos: [
        trabalho(2026, 9, 10, 5),
        trabalho(2026, 10, 10, 5),
        trabalho(2026, 11, 10, 2),
      ],
      abatidas: [],
      excedidas: [],
    });

    const total = await recalcularSaldoAcumulado(
      [{ usuarioId: USUARIO, clienteId: CLIENTE, servicoId: SERVICO, ano: 2026, mes: 11 }],
      { agora: new Date(2026, 10, 15), api },
    );

    expect(total).toBe(2);
    expect(api.salvos[0].map((item) => [item.mesOrigem, item.anoOrigem, item.deltaHoras])).toEqual([
      [9, 2026, 4],
      [10, 2026, 8],
    ]);
  });

  it('nao grava quando o saldo ja esta correto', async () => {
    const api = criarApiFake({
      servicos: [servico()],
      trabalhos: [trabalho(2026, 10, 10, 10)],
      abatidas: [],
      excedidas: [excedida(2026, 9, 40, 1), excedida(2026, 10, 50, 2)],
    });

    const total = await recalcularSaldoAcumulado(
      [{ usuarioId: USUARIO, clienteId: CLIENTE, servicoId: SERVICO, ano: 2026, mes: 10 }],
      { agora: new Date(2026, 10, 15), api },
    );

    expect(total).toBe(0);
    expect(api.salvos).toHaveLength(0);
  });

  it('considera apenas abatimentos da mesma cadeia', async () => {
    const api = criarApiFake({
      servicos: [servico()],
      trabalhos: [trabalho(2026, 6, 10, 10)],
      abatidas: [
        abatida(2026, 6, 2),
        abatida(2026, 6, 100, { clienteId: 99 }),
      ],
      excedidas: [excedida(2026, 5, 0, 1)],
    });

    await recalcularSaldoAcumulado(
      [{ usuarioId: USUARIO, clienteId: CLIENTE, servicoId: SERVICO, ano: 2026, mes: 6 }],
      { agora: new Date(2026, 10, 15), api },
    );

    expect(api.salvos[0][0].deltaHoras).toBe(8);
  });

  it('atravessa a virada de ano', async () => {
    const api = criarApiFake({
      servicos: [servico()],
      trabalhos: [trabalho(2025, 11, 10, 10), trabalho(2025, 12, 10, 10)],
      abatidas: [],
      excedidas: [excedida(2025, 10, 0, 1)],
    });

    const total = await recalcularSaldoAcumulado(
      [{ usuarioId: USUARIO, clienteId: CLIENTE, servicoId: SERVICO, ano: 2025, mes: 11 }],
      { agora: new Date(2026, 0, 15), api },
    );

    expect(total).toBe(2);
    expect(api.salvos[0].map((item) => [item.anoOrigem, item.mesOrigem, item.deltaHoras])).toEqual([
      [2025, 11, 10],
      [2025, 12, 20],
    ]);
  });

  it('nao cria saldo quando a cadeia nao tem dados nem historico', async () => {
    const api = criarApiFake({
      servicos: [servico('01:00:00')],
      trabalhos: [],
      abatidas: [],
      excedidas: [],
    });

    const total = await recalcularSaldoAcumulado(
      [{ usuarioId: USUARIO, clienteId: CLIENTE, servicoId: SERVICO, ano: 2026, mes: 6 }],
      { agora: new Date(2026, 10, 15), api },
    );

    expect(total).toBe(0);
    expect(api.salvos).toHaveLength(0);
  });

  it('ignora referencias sem cliente ou servico', async () => {
    const api = criarApiFake({
      servicos: [servico()],
      trabalhos: [trabalho(2026, 6, 10, 10)],
      abatidas: [],
      excedidas: [],
    });

    const total = await recalcularSaldoAcumulado(
      [{ usuarioId: USUARIO, clienteId: 0, servicoId: SERVICO, ano: 2026, mes: 6 }],
      { agora: new Date(2026, 10, 15), api },
    );

    expect(total).toBe(0);
    expect(api.salvos).toHaveLength(0);
  });
});

describe('referencias', () => {
  it('extrai mes e ano dos lancamentos', () => {
    expect(referenciasDeTrabalhos([trabalho(2026, 6, 10, 8)])).toEqual([
      { usuarioId: USUARIO, clienteId: CLIENTE, servicoId: SERVICO, ano: 2026, mes: 6 },
    ]);
    expect(referenciasDeAbatidas([abatida(2026, 7, 2)])).toEqual([
      { usuarioId: USUARIO, clienteId: CLIENTE, servicoId: SERVICO, ano: 2026, mes: 7 },
    ]);
  });
});
