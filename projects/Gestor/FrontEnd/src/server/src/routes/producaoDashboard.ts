import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { ano, mes } = req.query as { ano?: string; mes?: string };
    const params: Record<string, string> = {};
    if (ano) params.ano = ano;
    if (mes) params.mes = mes;
    const result = await horseApi.obterProducaoDashboard(Object.keys(params).length > 0 ? params : undefined);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
