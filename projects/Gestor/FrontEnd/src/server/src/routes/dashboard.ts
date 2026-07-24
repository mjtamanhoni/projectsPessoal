import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { dataInicio, dataFim, status } = req.query as { dataInicio?: string; dataFim?: string; status?: string };
    const filtros = {
      ...(dataInicio && { dataInicio }),
      ...(dataFim && { dataFim }),
      ...(status && { status: status as 'baixado' | 'aberto' | 'ambos' }),
    };
    const result = await horseApi.obterDashboard(Object.keys(filtros).length > 0 ? filtros : undefined);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
