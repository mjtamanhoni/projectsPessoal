import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { horaAbatidaBodySchema } from '../schemas';

const router = Router();

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
    const horas = Array.isArray(body) ? body : [body];
    console.log('[HorasAbatidas] Enviando para Horse:', JSON.stringify(horas[0]));
    const result = await horseApi.salvarHorasAbatidas(horas);
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
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    const result = await horseApi.excluirHoraAbatida(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
