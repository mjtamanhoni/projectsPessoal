import { Router, Response } from 'express';
import { horseApi } from '../services/horseApi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { empresaBodySchema, logomarcaBodySchema } from '../schemas';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.listarEmpresas(req.query as Record<string, unknown>);
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/', authMiddleware, validate(empresaBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const empresas = Array.isArray(body) ? body : [body];
    const result = await horseApi.salvarEmpresas(empresas);
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
    const result = await horseApi.excluirEmpresa(Number(id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/limpar-dados', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.body;
    if (!empresa_id) {
      res.status(400).json({ error: 'empresa_id é obrigatório' });
      return;
    }
    const result = await horseApi.limparDadosEmpresa(Number(empresa_id));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/logomarca', authMiddleware, validate(logomarcaBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id, logomarca } = req.body;
    const result = await horseApi.salvarEmpresaLogomarca(Number(id), String(logomarca ?? ''));
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/atualizar-sequencias', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await horseApi.atualizarSequencias();
    res.json(result);
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    res.status(status).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

export default router;
