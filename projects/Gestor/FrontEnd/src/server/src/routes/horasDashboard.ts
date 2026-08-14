import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { ano, mes, dataInicio, dataFim } = req.query as {
      ano?: string;
      mes?: string;
      dataInicio?: string;
      dataFim?: string;
    };
    const params: Record<string, string> = {};
    if (ano) params.ano = ano;
    if (mes) params.mes = mes;
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    for (const k of ['usuario_id', 'cliente_id', 'servico_id'] as const) {
      const v = req.query[k];
      if (typeof v === 'string' && v) params[k] = v;
    }
    const result = await horseApi.obterHorasDashboard(Object.keys(params).length > 0 ? params : undefined);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
