import type { HoraAbatida, HoraExcedida, HoraTrabalhada, Servico } from '../types';

export interface HorasSaldoApi {
  listarHorasTrabalhadas(params?: Record<string, unknown>): Promise<HoraTrabalhada[]>;
  listarHorasAbatidas(params?: Record<string, unknown>): Promise<HoraAbatida[]>;
  listarHorasExcedidas(params?: Record<string, unknown>): Promise<HoraExcedida[]>;
  listarServicos(params?: Record<string, unknown>): Promise<Servico[]>;
  salvarHorasExcedidas(horas: HoraExcedida[]): Promise<unknown>;
}

export interface MesReferencia {
  usuarioId: number;
  clienteId: number;
  servicoId: number;
  ano: number;
  mes: number;
}

export interface OpcoesRecalculo {
  agora?: Date;
  api?: HorasSaldoApi;
}

interface CadeiaSaldo {
  usuarioId: number;
  clienteId: number;
  servicoId: number;
  menorChave: number;
}

function chaveMes(ano: number, mes: number): number {
  return ano * 12 + (mes - 1);
}

function mesDaChave(chave: number): { ano: number; mes: number } {
  return { ano: Math.floor(chave / 12), mes: (chave % 12) + 1 };
}

function chaveDaData(data: string): number | null {
  const [ano, mes] = String(data ?? '').split('-').map(Number);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || ano < 1900 || ano > 9999 || mes < 1 || mes > 12) {
    return null;
  }
  return chaveMes(ano, mes);
}

function primeiroDiaDoMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-01`;
}

function ultimoDiaDoMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
}

function parseIntervalToDecimal(intervalo: string): number {
  const match = String(intervalo ?? '').match(/(\d+):(\d+):(\d+)/);
  if (!match) return 0;
  return Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600;
}

function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function chaveCadeia(usuarioId: number, clienteId: number, servicoId: number): string {
  return `${usuarioId}:${clienteId}:${servicoId}`;
}

function mesmaCadeia(
  item: { usuarioId?: number; clienteId?: number; servicoId?: number },
  usuarioId: number,
  clienteId: number,
  servicoId: number,
): boolean {
  return item.usuarioId === usuarioId && item.clienteId === clienteId && item.servicoId === servicoId;
}

function agruparReferencias(referencias: MesReferencia[]): Map<string, CadeiaSaldo> {
  const cadeias = new Map<string, CadeiaSaldo>();
  for (const referencia of referencias) {
    const usuarioId = Number(referencia.usuarioId);
    const clienteId = Number(referencia.clienteId);
    const servicoId = Number(referencia.servicoId);
    const ano = Number(referencia.ano);
    const mes = Number(referencia.mes);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) continue;
    if (!Number.isInteger(clienteId) || clienteId <= 0) continue;
    if (!Number.isInteger(servicoId) || servicoId <= 0) continue;
    if (!Number.isInteger(ano) || ano < 1900 || ano > 9999) continue;
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) continue;

    const chave = chaveCadeia(usuarioId, clienteId, servicoId);
    const mesChave = chaveMes(ano, mes);
    const existente = cadeias.get(chave);
    if (existente) {
      existente.menorChave = Math.min(existente.menorChave, mesChave);
    } else {
      cadeias.set(chave, { usuarioId, clienteId, servicoId, menorChave: mesChave });
    }
  }
  return cadeias;
}

export function referenciasDeTrabalhos(horas: HoraTrabalhada[]): MesReferencia[] {
  return horas.map((hora) => {
    const [ano, mes] = String(hora.dataServico ?? '').split('-').map(Number);
    return {
      usuarioId: Number(hora.usuarioId ?? 0),
      clienteId: Number(hora.clienteId ?? 0),
      servicoId: Number(hora.servicoId ?? 0),
      ano: Number(ano),
      mes: Number(mes),
    };
  });
}

export function referenciasDeAbatidas(abatidas: HoraAbatida[]): MesReferencia[] {
  return abatidas.map((abatida) => {
    const [ano, mes] = String(abatida.dataAbatimento ?? '').split('-').map(Number);
    return {
      usuarioId: Number(abatida.usuarioId ?? 0),
      clienteId: Number(abatida.clienteId ?? 0),
      servicoId: Number(abatida.servicoId ?? 0),
      ano: Number(ano),
      mes: Number(mes),
    };
  });
}

export async function recalcularSaldoAcumulado(
  referencias: MesReferencia[],
  opcoes: OpcoesRecalculo = {},
): Promise<number> {
  const cadeias = agruparReferencias(referencias);
  if (cadeias.size === 0) return 0;

  const api = opcoes.api ?? (await import('./horseApi')).horseApi;
  const agora = opcoes.agora ?? new Date();
  const mesFinal = chaveMes(agora.getFullYear(), agora.getMonth() + 1);
  let servicos: Servico[] | null = null;
  let totalSalvo = 0;

  for (const cadeia of cadeias.values()) {
    const { usuarioId, clienteId, servicoId, menorChave } = cadeia;

    const excedidas = await api.listarHorasExcedidas({
      usuario_id: usuarioId,
      cliente_id: clienteId,
      servico_id: servicoId,
    });

    const porMes = new Map<number, HoraExcedida>();
    for (const excedida of excedidas) {
      porMes.set(chaveMes(Number(excedida.anoOrigem), Number(excedida.mesOrigem)), excedida);
    }

    let registroAnterior: [number, HoraExcedida] | null = null;
    for (const [chave, registro] of porMes.entries()) {
      if (chave >= menorChave) continue;
      if (!registroAnterior || chave > registroAnterior[0]) {
        registroAnterior = [chave, registro];
      }
    }

    let inicio: number;
    let saldo: number;

    if (registroAnterior) {
      inicio = registroAnterior[0] + 1;
      saldo = Number(registroAnterior[1].deltaHoras) || 0;
    } else {
      const [todosTrabalhos, todasAbatidas] = await Promise.all([
        api.listarHorasTrabalhadas({ usuario_id: usuarioId, cliente_id: clienteId, servico_id: servicoId }),
        api.listarHorasAbatidas({ usuario_id: usuarioId }),
      ]);

      let primeiraChave: number | null = null;
      const considerar = (chave: number | null): void => {
        if (chave === null) return;
        if (primeiraChave === null || chave < primeiraChave) primeiraChave = chave;
      };

      for (const trabalho of todosTrabalhos) considerar(chaveDaData(trabalho.dataServico));
      for (const abatida of todasAbatidas) {
        if (!mesmaCadeia(abatida, usuarioId, clienteId, servicoId)) continue;
        considerar(chaveDaData(abatida.dataAbatimento));
      }

      if (primeiraChave === null && porMes.size === 0) continue;

      inicio = primeiraChave === null ? menorChave : Math.min(primeiraChave, menorChave);
      saldo = 0;
    }

    if (inicio > mesFinal) continue;

    const { ano: anoInicio, mes: mesInicio } = mesDaChave(inicio);
    const { ano: anoFim, mes: mesFim } = mesDaChave(mesFinal);

    const [trabalhos, abatidas] = await Promise.all([
      api.listarHorasTrabalhadas({
        usuario_id: usuarioId,
        cliente_id: clienteId,
        servico_id: servicoId,
        data_inicial: primeiroDiaDoMes(anoInicio, mesInicio),
        data_final: ultimoDiaDoMes(anoFim, mesFim),
      }),
      api.listarHorasAbatidas({
        usuario_id: usuarioId,
        data_inicial: primeiroDiaDoMes(anoInicio, mesInicio),
        data_final: ultimoDiaDoMes(anoFim, mesFim),
      }),
    ]);

    if (!servicos) {
      servicos = await api.listarServicos();
    }
    const servico = servicos.find((item) => (item.id ?? item.codigo) === servicoId);
    const horasMinimas = parseIntervalToDecimal(servico?.horasMinimas ?? '0');

    const trabalhadasPorMes = new Map<number, number>();
    for (const trabalho of trabalhos) {
      if (!mesmaCadeia(trabalho, usuarioId, clienteId, servicoId)) continue;
      const chave = chaveDaData(trabalho.dataServico);
      if (chave === null) continue;
      trabalhadasPorMes.set(chave, (trabalhadasPorMes.get(chave) ?? 0) + (Number(trabalho.quantidadeHoras) || 0));
    }

    const abatidasPorMes = new Map<number, number>();
    for (const abatida of abatidas) {
      if (!mesmaCadeia(abatida, usuarioId, clienteId, servicoId)) continue;
      const chave = chaveDaData(abatida.dataAbatimento);
      if (chave === null) continue;
      abatidasPorMes.set(chave, (abatidasPorMes.get(chave) ?? 0) + (Number(abatida.quantidadeHoras) || 0));
    }

    const paraSalvar: HoraExcedida[] = [];
    for (let chave = inicio; chave <= mesFinal; chave++) {
      const { ano, mes } = mesDaChave(chave);
      const existente = porMes.get(chave);
      const ajuste = Number(existente?.ajusteManual) || 0;
      saldo = arredondar(saldo + (trabalhadasPorMes.get(chave) ?? 0) - (abatidasPorMes.get(chave) ?? 0) - horasMinimas + ajuste);

      if (existente && Math.abs(Number(existente.deltaHoras) - saldo) < 0.005) continue;

      paraSalvar.push({
        ...(existente?.id ? { id: existente.id } : {}),
        usuarioId,
        clienteId,
        servicoId,
        mesOrigem: mes,
        anoOrigem: ano,
        deltaHoras: saldo,
      });
    }

    if (paraSalvar.length > 0) {
      await api.salvarHorasExcedidas(paraSalvar);
      totalSalvo += paraSalvar.length;
    }
  }

  return totalSalvo;
}

export async function recalcularSaldoAcumuladoSeguro(
  referencias: MesReferencia[],
  contexto: string,
): Promise<void> {
  try {
    const total = await recalcularSaldoAcumulado(referencias);
    if (total > 0) {
      console.log(`[HorasSaldo] ${contexto}: ${total} registro(s) de saldo recalculado(s)`);
    }
  } catch (error: unknown) {
    console.error(`[HorasSaldo] Erro ao recalcular saldo (${contexto}):`, error instanceof Error ? error.message : error);
  }
}
