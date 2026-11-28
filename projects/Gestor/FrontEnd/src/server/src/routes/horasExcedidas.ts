import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { horaExcedidaAjusteBodySchema } from '../schemas';
import type { HoraExcedidaAjusteInput } from '../types';
import { recalcularSaldoAcumuladoSeguro } from '../services/horasSaldo';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarHorasExcedidas(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const horas = Array.isArray(body) ? body : [body];
    const result = await horseApi.salvarHorasExcedidas(horas);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/ajuste', authMiddleware, validate(horaExcedidaAjusteBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as HoraExcedidaAjusteInput;
    const result = await horseApi.ajustarHoraExcedida(body);

    await recalcularSaldoAcumuladoSeguro(
      [{
        usuarioId: body.usuarioId,
        clienteId: body.clienteId,
        servicoId: body.servicoId,
        ano: body.ano,
        mes: body.mes,
      }],
      'ajuste manual de horas excedidas',
    );

    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
