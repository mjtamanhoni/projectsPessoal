import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

function statusDoErro(error: unknown): number {
  return error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const params = { ...(req.query as Record<string, unknown>) };
    if (req.empresaId && req.empresaId > 0 && params.empresa_id === undefined) {
      params.empresa_id = req.empresaId;
    }
    const result = await horseApi.listarRegioesEntrega(params);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/lote', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = { ...(req.body as Record<string, unknown>) };
    if (req.empresaId && req.empresaId > 0) {
      body.empresa_id = req.empresaId;
    }
    const result = await horseApi.salvarRegioesEntregaLote(body);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = { ...(req.body as Record<string, unknown>) };
    if (req.empresaId && req.empresaId > 0) {
      body.empresa_id = req.empresaId;
    }
    const result = await horseApi.adicionarRegiaoEntrega(body);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.delete('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ error: 'ID e obrigatorio' });
      return;
    }
    const empresaId = req.empresaId && req.empresaId > 0 ? req.empresaId : undefined;
    const result = await horseApi.excluirRegiaoEntrega(Number(id), empresaId);
    res.json(result);
  } catch (error: unknown) {
    res.status(statusDoErro(error)).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
