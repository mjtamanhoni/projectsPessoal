import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { horaAbatidaBodySchema } from '../schemas';
import type { HoraAbatida } from '../types';
import { recalcularSaldoAcumuladoSeguro, referenciasDeAbatidas } from '../services/horasSaldo';

const router = Router();

async function buscarAbatidasPorId(abatidas: HoraAbatida[]): Promise<HoraAbatida[]> {
  const encontradas: HoraAbatida[] = [];
  for (const abatida of abatidas) {
    const id = Number(abatida.id ?? abatida.codigo ?? 0);
    if (id <= 0) continue;
    const registros = await horseApi.listarHorasAbatidas({ id });
    if (registros.length > 0) encontradas.push(registros[0]);
  }
  return encontradas;
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[HorasAbatidas] GET recebido, query:', JSON.stringify(req.query));
    const result = await horseApi.listarHorasAbatidas(req.query as Record<string, unknown>);
    console.log('[HorasAbatidas] Resultado:', result.length, 'registros');
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, validate(horaAbatidaBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    console.log('[HorasAbatidas] POST recebido, body:', JSON.stringify(req.body));
    const body = req.body;
    const horas: HoraAbatida[] = Array.isArray(body) ? body : [body];
    console.log('[HorasAbatidas] Enviando para Horse:', JSON.stringify(horas[0]));

    const horasAnteriores = await buscarAbatidasPorId(horas);
    const result = await horseApi.salvarHorasAbatidas(horas);

    await recalcularSaldoAcumuladoSeguro(
      [...referenciasDeAbatidas(horasAnteriores), ...referenciasDeAbatidas(horas)],
      'lancamento de abatimento',
    );

    console.log('[HorasAbatidas] Resultado do Horse:', result);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    console.error('[HorasAbatidas] Erro:', error instanceof Error ? error.message : error);
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

    const horasAnteriores = await horseApi.listarHorasAbatidas({ id });
    const result = await horseApi.excluirHoraAbatida(id);

    await recalcularSaldoAcumuladoSeguro(referenciasDeAbatidas(horasAnteriores), 'exclusao de abatimento');

    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
