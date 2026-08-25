import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { adicionalClassificacaoBodySchema } from '../schemas';
import type { AdicionalProdutoClassificacao } from '../types';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = (await horseApi.listarAdicionaisClassificacoes(
      req.query as Record<string, unknown>,
    )) as AdicionalProdutoClassificacao[];
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, validate(adicionalClassificacaoBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.salvarAdicionaisClassificacoes(req.body);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { adicional_id, produto_classificacao_id } = req.query;
    if (!adicional_id || !produto_classificacao_id) {
      res.status(400).json({ error: 'adicional_id e produto_classificacao_id sao obrigatorios' });
      return;
    }
    const result = await horseApi.excluirAdicionalClassificacao(Number(adicional_id), Number(produto_classificacao_id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;