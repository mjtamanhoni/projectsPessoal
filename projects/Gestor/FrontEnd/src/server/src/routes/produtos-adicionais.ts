import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { produtoAdicionalBodySchema } from '../schemas';
import type { ProdutoAdicional } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = (await horseApi.listarProdutosAdicionais(
      req.query as Record<string, unknown>,
    )) as ProdutoAdicional[];
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, validate(produtoAdicionalBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.salvarProdutosAdicionais(req.body);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { produto_fabricado_id, adicional_id } = req.query;
    if (!produto_fabricado_id || !adicional_id) {
      res.status(400).json({ error: 'produto_fabricado_id e adicional_id sao obrigatorios' });
      return;
    }
    const result = await horseApi.excluirProdutoAdicional(Number(produto_fabricado_id), Number(adicional_id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;