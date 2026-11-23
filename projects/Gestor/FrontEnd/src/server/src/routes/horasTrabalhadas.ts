import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { horaTrabalhadaBodySchema } from '../schemas';
import type { HoraTrabalhada } from '../types';
import { recalcularSaldoAcumuladoSeguro, referenciasDeTrabalhos } from '../services/horasSaldo';

const router = Router();

async function buscarHorasPorId(horas: HoraTrabalhada[]): Promise<HoraTrabalhada[]> {
  const encontradas: HoraTrabalhada[] = [];
  for (const hora of horas) {
    const id = Number(hora.id ?? hora.codigo ?? 0);
    if (id <= 0) continue;
    const registros = await horseApi.listarHorasTrabalhadas({ id });
    if (registros.length > 0) encontradas.push(registros[0]);
  }
  return encontradas;
}

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
    const horas: HoraTrabalhada[] = Array.isArray(body) ? body : [body];

    console.log('[HorasTrabalhadas] Inicio da Insercao, dados:', JSON.stringify(horas[0]));

    const horasAnteriores = await buscarHorasPorId(horas);
    const result = await horseApi.salvarHorasTrabalhadas(horas);

    await recalcularSaldoAcumuladoSeguro(
      [...referenciasDeTrabalhos(horasAnteriores), ...referenciasDeTrabalhos(horas)],
      'lancamento de horas',
    );

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
    const id = Number(req.query.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }

    const horasAnteriores = await horseApi.listarHorasTrabalhadas({ id });
    const result = await horseApi.excluirHoraTrabalhada(id);

    await recalcularSaldoAcumuladoSeguro(referenciasDeTrabalhos(horasAnteriores), 'exclusao de horas');

    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
