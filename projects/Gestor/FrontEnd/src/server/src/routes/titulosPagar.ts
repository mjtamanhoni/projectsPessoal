import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import type { TituloPagarInput } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, status, credor, dataInicio, dataFim } = req.query as Record<string, string>;
    const horseParams: Record<string, unknown> = {};
    if (id) horseParams.id = id;
    if (status) horseParams.status = status;
    if (credor) horseParams.credor = credor;
    if (dataInicio) horseParams.data_inicial = dataInicio;
    if (dataFim) horseParams.data_final = dataFim;
    if (req.empresaId) horseParams.empresa_id = req.empresaId;
    const result = await horseApi.listarTitulosPagar(horseParams);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const titulos = (Array.isArray(body) ? body : [body]) as TituloPagarInput[];
    if (!titulos.length || titulos.some((t) => !t.credor)) {
      res.status(400).json({ error: 'Credor é obrigatório' });
      return;
    }
    if (titulos.some((t) => !t.valorTotal || Number(t.valorTotal) <= 0 || !t.dataVencimento)) {
      res.status(400).json({ error: 'Valor e data de vencimento são obrigatórios' });
      return;
    }
    const result = await horseApi.salvarTitulosPagar(titulos);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID é obrigatório' });
      return;
    }
    const result = await horseApi.excluirTituloPagar(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/baixa-total', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: 'ID é obrigatório' });
      return;
    }
    const result = await horseApi.baixarTituloTotal(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
