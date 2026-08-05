import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { horaTrabalhadaBodySchema } from '../schemas';
import type { HoraExcedida } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[HorasTrabalhadas] Listagem iniciada, usuarioId:', req.usuarioId);
    const result = await horseApi.listarHorasTrabalhadas(req.query as Record<string, unknown>);
    console.log('[HorasTrabalhadas] Listagem resultado:', Array.isArray(result) ? `${result.length} registros` : 'nao-array', Array.isArray(result) && result.length > 0 ? JSON.stringify(result[0]) : '');
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    console.error('[HorasTrabalhadas] Erro na listagem:', status, error instanceof Error ? error.message : error);
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, validate(horaTrabalhadaBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const horas = Array.isArray(body) ? body : [body];
    const primeiraHora = horas[0];

    console.log('[HorasTrabalhadas] Inicio da Insercao, dados:', JSON.stringify(primeiraHora));

    if (primeiraHora?.usuarioId && primeiraHora?.clienteId && primeiraHora?.servicoId && primeiraHora?.dataServico) {
      const [ano, mes] = primeiraHora.dataServico.split('-').map(Number);

      const mesAnterior = mes === 1 ? 12 : mes - 1;
      const anoAnterior = mes === 1 ? ano - 1 : ano;

      const primeiroDiaMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDiaMes = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;

      const ultimoDiaMesAnterior = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-${new Date(anoAnterior, mesAnterior, 0).getDate()}`;
      const primeiroDiaMesAnterior = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-01`;

      const entradasMesAtual = await horseApi.listarHorasTrabalhadas({
        usuario_id: primeiraHora.usuarioId,
        cliente_id: primeiraHora.clienteId,
        servico_id: primeiraHora.servicoId,
        data_inicial: primeiroDiaMes,
        data_final: ultimoDiaMes,
      });

      if (entradasMesAtual.length === 0) {
        console.log('[HorasTrabalhadas] Primeiro lancamento do mes, verificando horas excedentes...');

        const entradasMesAnterior = await horseApi.listarHorasTrabalhadas({
          usuario_id: primeiraHora.usuarioId,
          cliente_id: primeiraHora.clienteId,
          servico_id: primeiraHora.servicoId,
          data_inicial: primeiroDiaMesAnterior,
          data_final: ultimoDiaMesAnterior,
        });

        const abatimentosMesAnterior = await horseApi.listarHorasAbatidas({
          usuario_id: primeiraHora.usuarioId,
          data_inicial: primeiroDiaMesAnterior,
          data_final: ultimoDiaMesAnterior,
        });

        const totalHorasTrabalhadas = entradasMesAnterior.reduce((acc, h) => acc + (h.quantidadeHoras ?? 0), 0);
        const totalHorasAbatidas = abatimentosMesAnterior.reduce((acc, a) => acc + a.quantidadeHoras, 0);

        const servicos = await horseApi.listarServicos();
        const servico = servicos.find((s) => (s.id ?? s.codigo) === primeiraHora.servicoId);

        const parseIntervalToDecimal = (iv: string): number => {
          const match = iv.match(/(\d+):(\d+):(\d+)/);
          if (!match) return 0;
          return Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600;
        };
        const horasMinimas = parseIntervalToDecimal(servico?.horasMinimas ?? '0');

        const mesSaldoAnterior = mesAnterior === 1 ? 12 : mesAnterior - 1;
        const anoSaldoAnterior = mesAnterior === 1 ? anoAnterior - 1 : anoAnterior;

        const excedidasSaldoAnterior = await horseApi.listarHorasExcedidas({
          usuario_id: primeiraHora.usuarioId,
          cliente_id: primeiraHora.clienteId,
          servico_id: primeiraHora.servicoId,
          mes_origem: mesSaldoAnterior,
          ano_origem: anoSaldoAnterior,
        });

        const saldoAcumuladoAnterior = excedidasSaldoAnterior.length > 0 ? excedidasSaldoAnterior[0].deltaHoras : 0;

        const totalHorasExcedidas = totalHorasTrabalhadas - totalHorasAbatidas - horasMinimas;

        const novoSaldo = saldoAcumuladoAnterior + totalHorasExcedidas;

        console.log(`[HorasTrabalhadas] Saldo acumulado (${String(mesSaldoAnterior).padStart(2, '0')}/${anoSaldoAnterior}): ${saldoAcumuladoAnterior}, Excedidas (${String(mesAnterior).padStart(2, '0')}/${anoAnterior}): ${totalHorasExcedidas}, Novo saldo: ${novoSaldo}`);

        const excedidasMesRef = await horseApi.listarHorasExcedidas({
          usuario_id: primeiraHora.usuarioId,
          cliente_id: primeiraHora.clienteId,
          servico_id: primeiraHora.servicoId,
          mes_origem: mesAnterior,
          ano_origem: anoAnterior,
        });

        const acumulado: HoraExcedida = {
          ...(excedidasMesRef.length > 0 ? { id: excedidasMesRef[0].id } : {}),
          usuarioId: Number(primeiraHora.usuarioId),
          clienteId: Number(primeiraHora.clienteId),
          servicoId: Number(primeiraHora.servicoId),
          mesOrigem: mesAnterior,
          anoOrigem: anoAnterior,
          deltaHoras: novoSaldo,
        };

        console.log('[HorasTrabalhadas] Registrando acumulado:', JSON.stringify(acumulado));
        await horseApi.salvarHorasExcedidas([acumulado]);
        console.log('[HorasTrabalhadas] Acumulado registrado com sucesso');
      }
    }

    const result = await horseApi.salvarHorasTrabalhadas(horas);
    console.log('[HorasTrabalhadas] Insercao bem sucedida:', result);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    console.error('[HorasTrabalhadas] Erro na Insercao:', status, error instanceof Error ? error.message : error);
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    const result = await horseApi.excluirHoraTrabalhada(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
