import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { receitaIngredienteBodySchema } from '../schemas';
import type { ReceitaIngrediente } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = (await horseApi.listarReceitasIngrediente(
      req.query as Record<string, unknown>,
    )) as ReceitaIngrediente[];
    try {
      const insumos = await horseApi.listarInsumos();
      const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
      for (const item of result) {
        const insumo = item.insumo_id != null ? insumoPorId.get(item.insumo_id) : undefined;
        if (!insumo) continue;
        item.insumo_nome = item.insumo_nome ?? insumo.nome;
        item.insumo_unidade_medida = item.insumo_unidade_medida ?? insumo.unidade_medida;
        if (item.insumo_custo_medio == null || item.insumo_custo_medio === 0) {
          item.insumo_custo_medio = insumo.custo_medio ?? 0;
        }
        item.insumo_ativo = item.insumo_ativo ?? insumo.ativo;
      }
    } catch {
      // enriquecimento opcional: a listagem segue mesmo sem os custos dos insumos
    }
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, validate(receitaIngredienteBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const items = Array.isArray(body) ? body : [body];
    const result = await horseApi.salvarReceitasIngrediente(items);
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
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    const result = await horseApi.excluirReceitaIngrediente(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
